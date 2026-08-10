// The four step prompts for the DecisionIQ analysis chain.
// All content is AI-generated server-side; these prompts are the only
// scaffolding. Nothing here is returned to the user verbatim.

import type { OptionAverage, OptionScoring, Recommendation } from "./types.ts";

export function generateCriteriaPrompt(
  decisionQuestion: string,
  options: string[],
): string {
  return `You are an expert decision analyst helping a professional make a structured decision.

Decision question: "${decisionQuestion}"

The person is choosing between these options:
${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}

Generate 4 to 5 concise, decision-relevant evaluation criteria that a rational analyst would use to compare these options. Use short noun phrases (2-5 words), e.g. "Total cost of ownership", "Ease of implementation", "Vendor reliability", "Long-term scalability".

Return ONLY a JSON object matching this schema:
{
  "criteria": ["criterion one", "criterion two", "..."]
}

Rules:
- Each criterion must be short, distinct, and meaningful for comparing these specific options.
- Do not include "Overall value" or other catch-all criteria; each criterion must be independently scorable.`;
}

export function scoreOptionPrompt(
  decisionQuestion: string,
  option: string,
  criteria: string[],
): string {
  return `You are an expert decision analyst scoring ONE option for a structured decision.

Decision question: "${decisionQuestion}"
Option to score: "${option}"

Score this option against EXACTLY these criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Return ONLY a JSON object matching this schema:
{
  "option": "<the exact option text verbatim>",
  "scores": [
    { "criterion": "<exact criterion text verbatim>", "score": <integer 1-10>, "justification": "<one sentence>" }
  ]
}

Rules:
- Include EVERY criterion exactly once, with the criterion text verbatim.
- Score on an absolute scale: 10 = outstanding for this decision, 1 = poor. Be objective and consistent — the same criterion must mean the same thing across all options.
- Each justification is exactly one sentence of concrete, option-specific reasoning. No filler.`;
}

export function synthesizeRecommendationPrompt(
  decisionQuestion: string,
  options: string[],
  criteria: string[],
  scoring: OptionScoring[],
): string {
  return `You are an expert decision analyst synthesizing a recommendation from a completed score matrix.

Decision question: "${decisionQuestion}"
Options considered:
${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}
Evaluation criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Score matrix (1-10, higher is better):
${formatScoreMatrix(scoring)}

Return ONLY a JSON object matching this schema:
{
  "recommendedOption": "<exact option text verbatim>",
  "confidence": "High" | "Medium" | "Low",
  "explanation": "<2-3 sentences>",
  "keyAssumptions": ["<assumption one>", "<assumption two>", "<assumption three>"],
  "whatWouldChangeThis": "<one sentence>"
}

Rules:
- Pick the option with the strongest overall case based on the matrix. If the top options are close, say so and set a lower confidence.
- confidence reflects how robust the recommendation is given the evidence: High = clear leader, Medium = competitive, Low = weak or highly uncertain evidence.
- explanation: 2-3 sentences that walk through the reasoning, referencing the scores.
- keyAssumptions: 2-3 explicit assumptions the recommendation relies on.
- whatWouldChangeThis: one sentence stating what new evidence or change in conditions would flip the recommendation.`;
}

export function consistencyCheckPrompt(
  decisionQuestion: string,
  criteria: string[],
  scoring: OptionScoring[],
  recommendation: Recommendation,
  averages: OptionAverage[],
): string {
  return `You are an independent auditor checking whether a decision recommendation is consistent with the evidence. Do not be lenient — actively look for contradictions.

Decision question: "${decisionQuestion}"
Evaluation criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Score matrix (1-10, higher is better):
${formatScoreMatrix(scoring)}

Average scores (as shown in the comparison table):
${formatAverages(averages)}

Proposed recommendation:
- Recommended option: "${recommendation.recommendedOption}"
- Confidence: ${recommendation.confidence}
- Explanation: ${recommendation.explanation}
- Key assumptions: ${recommendation.keyAssumptions.map((a) => `"${a}"`).join(", ")}
- What would change this: ${recommendation.whatWouldChangeThis}

Verify against the average scores above:
1. Is the recommended option genuinely the strongest on average? If the top two averages are within 0.3 points of each other, that is a genuine near-tie and the recommendation must be treated as a close call.
2. Does the stated confidence match the average gap? A leader with a 0.4+ point average lead is a clear winner and must NOT be described as a near-tie or low-confidence.
3. Do the explanation and assumptions contradict any cell in the matrix?

Return ONLY a JSON object matching this schema:
{
  "status": "consistent" | "contradiction",
  "note": "<optional one-sentence explanation when status is contradiction>"
}

If everything holds up, return "consistent" with no note. If you find a real contradiction, return "contradiction" with a specific one-sentence note.
Note wording rules: state the facts neutrally — name the two options and their average scores (e.g. "Option A and Option B have very close average scores (8.0 vs 7.9), so treat this recommendation as a close call rather than a clear winner"). Never accuse the explanation, scoring, or recommendation of being wrong, misleading, or inaccurate.`;
}

function formatScoreMatrix(scoring: OptionScoring[]): string {
  const lines: string[] = [];
  for (const row of scoring) {
    lines.push(`Option "${row.option}":`);
    for (const s of row.scores) {
      lines.push(`  - ${s.criterion}: ${s.score}/10 — ${s.justification}`);
    }
  }
  return lines.join("\n");
}

function formatAverages(averages: OptionAverage[]): string {
  if (averages.length === 0) return "(none)";
  return averages
    .map((a) => `- ${a.option}: ${a.average.toFixed(1)}`)
    .join("\n");
}
