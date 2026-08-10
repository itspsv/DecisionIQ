// analyze-decision — DecisionIQ's 4-step AI analysis chain.
//
// Public Edge Function (no login). The client posts
//   { decisionQuestion, options[], criteria[] }
// and receives a complete Decision Brief. The Groq API key lives only in
// Supabase Secret Manager (GROQ_API_KEY) and is read via Deno.env.get().
// Groq's OpenAI-compatible chat completions API is called directly with
// fetch() — no SDK dependency to resolve on the Deno edge runtime.

import type {
  ConsistencyResult,
  ConsistencyStepResult,
  CriteriaStepResult,
  DecisionBrief,
  OptionAverage,
  OptionScoring,
  Recommendation,
  RecommendationStepResult,
  ScoreEntry,
  ScoringStepResult,
} from "./types.ts";
import {
  consistencyCheckPrompt,
  generateCriteriaPrompt,
  scoreOptionPrompt,
  synthesizeRecommendationPrompt,
} from "./prompts.ts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
// Model fallback chain, tried in order until one succeeds. Fast, capable
// models first, so a quota-limited key still works because each step rolls
// over to the next model. Operators can pin a preferred model via the
// GROQ_MODEL secret (e.g. "llama-3.3-70b-versatile"); duplicates are
// de-duplicated below.
//
// NOTE (2026-01): Verified live by direct probe — only llama-3.3-70b-versatile
// and llama-3.1-8b-instant are available on this Groq account and support JSON
// mode. Groq has decommissioned gemma2-9b-it, llama-3.3-70b-specdec,
// deepseek-r1-distill-llama-70b, and mistral-saba-24b; the Llama 4 / Qwen3 /
// GPT-OSS names are not available here. Keep the chain to live models so a
// quota-limited key fails fast and clearly instead of crawling through dead
// or slow models.
const MODEL_CHAIN = [
  Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// Low temperature keeps scoring consistent across the 4-step chain.
const GENERATION_TEMPERATURE = 0.4;
const GENERATION_MAX_TOKENS = 2048;
const REQUEST_TIMEOUT_MS = 60_000;

// Near-tie detection is based on the average scores the comparison table shows
// (out of 10, rounded to one decimal). The gap is compared in integer tenths
// so floating-point noise can never misclassify an exact 0.3 display gap
// (e.g. 8.0 vs 7.7) as a near-tie. Below NEAR_TIE_GAP_TENTHS the top two
// options are a genuine near-tie and the result is flagged for review; at or
// above CLEAR_LEAD_GAP_TENTHS the leader is clearly ahead and the result is
// never flagged as a close call. The band between the two is genuinely
// borderline, so the auditor's verdict stands.
const NEAR_TIE_GAP_TENTHS = 3; // displayed average gap under 0.3
const CLEAR_LEAD_GAP_TENTHS = 4; // displayed average gap of 0.4 or more

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Groq client + JSON generation helper
// ---------------------------------------------------------------------------

function getGroqKey(): string {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY secret is not configured");
  }
  return GROQ_API_KEY;
}

/**
 * Parses a model response as JSON, tolerating code-fence wrapping. JSON mode
 * returns raw JSON, but the fallback keeps the chain robust across models.
 */
function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        // fall through to the error below
      }
    }
    throw new Error("Model returned invalid JSON");
  }
}

async function generateJson<T>(contents: string): Promise<T> {
  let lastError: unknown;
  for (const model of MODEL_CHAIN) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getGroqKey()}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: contents }],
          temperature: GENERATION_TEMPERATURE,
          max_tokens: GENERATION_MAX_TOKENS,
          // JSON mode: guarantees a parseable JSON object (prompts already
          // instruct the model to return ONLY a JSON object).
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Groq API error (${response.status}, model "${model}"): ${
            detail.slice(0, 500)
          }`,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error(`Model "${model}" returned an empty response`);
      }
      return parseJsonResponse(text) as T;
    } catch (err) {
      console.error(`[analyze-decision] model "${model}" failed:`, err);
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("All configured models failed");
}

/** Retry-once policy: any AI/network/shape failure triggers a single retry. */
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[analyze-decision] ${label} (attempt 1) failed:`, err);
    return await fn();
  }
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

type ValidatedInput = {
  decisionQuestion: string;
  options: string[];
  criteria: string[];
};

function validateInput(body: unknown): ValidatedInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;
  const question =
    typeof b.decisionQuestion === "string" ? b.decisionQuestion.trim() : "";
  if (!question) return { error: "Decision question is required" };

  const options = Array.isArray(b.options)
    ? b.options
        .map((o) => (typeof o === "string" ? o.trim() : ""))
        .filter((o) => o.length > 0)
    : [];
  if (options.length < 2) return { error: "At least two options are required" };
  if (options.length > 4) return { error: "At most four options are allowed" };

  const criteria = Array.isArray(b.criteria)
    ? b.criteria
        .map((c) => (typeof c === "string" ? c.trim() : ""))
        .filter((c) => c.length > 0)
    : [];
  if (criteria.length > 6) return { error: "At most six criteria are allowed" };

  return { decisionQuestion: question, options, criteria };
}

// ---------------------------------------------------------------------------
// Shape repair + deterministic guards (run on top of the AI output)
// ---------------------------------------------------------------------------

function normalizeCriteria(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const c = raw.trim();
    if (!c) continue;
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= 6) break;
  }
  return out;
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error("Model returned a non-numeric score");
  }
  return Math.min(10, Math.max(1, Math.round(n)));
}

/**
 * Rebuilds one option's scoring against the canonical criteria list.
 * Throws if a criterion is missing so the retry-once policy kicks in rather
 * than fabricating a score.
 */
function repairOptionScoring(
  option: string,
  criteria: string[],
  raw: ScoringStepResult,
): OptionScoring {
  const byKey = new Map<string, ScoreEntry>();
  for (const entry of raw.scores ?? []) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const criterion =
      typeof e.criterion === "string" ? e.criterion.trim() : "";
    if (!criterion) continue;
    byKey.set(criterion.toLowerCase(), {
      criterion,
      score: clampScore(e.score),
      justification:
        typeof e.justification === "string" && e.justification.trim()
          ? e.justification.trim()
          : "No justification provided.",
    });
  }
  const scores: ScoreEntry[] = [];
  for (const c of criteria) {
    const entry = byKey.get(c.toLowerCase());
    if (!entry) {
      throw new Error(`Scoring for "${option}" is missing criterion "${c}"`);
    }
    scores.push({ ...entry, criterion: c });
  }
  return { option, scores };
}

function matchOption(
  candidate: unknown,
  options: string[],
): string | undefined {
  if (typeof candidate !== "string") return undefined;
  const key = candidate.trim().toLowerCase();
  if (!key) return undefined;
  return options.find((o) => o.trim().toLowerCase() === key);
}

function highestAverageIndex(
  options: string[],
  scoring: OptionScoring[],
): number {
  let best = 0;
  let bestAvg = -1;
  for (let i = 0; i < options.length; i++) {
    const scores =
      scoring.find((s) => s.option === options[i])?.scores ?? [];
    const avg =
      scores.length > 0
        ? scores.reduce((acc, s) => acc + s.score, 0) / scores.length
        : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = i;
    }
  }
  return best;
}

function repairRecommendation(
  options: string[],
  scoring: OptionScoring[],
  raw: RecommendationStepResult,
): Recommendation {
  const confidence =
    raw.confidence === "High" || raw.confidence === "Medium" ||
    raw.confidence === "Low"
      ? raw.confidence
      : "Medium";
  const matched = matchOption(raw.recommendedOption, options);
  const recommendedOption = matched ?? options[highestAverageIndex(options, scoring)];
  const explanation =
    typeof raw.explanation === "string" && raw.explanation.trim()
      ? raw.explanation.trim()
      : "";
  const keyAssumptions = Array.isArray(raw.keyAssumptions)
    ? raw.keyAssumptions
        .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        .slice(0, 3)
    : [];
  const whatWouldChangeThis =
    typeof raw.whatWouldChangeThis === "string"
      ? raw.whatWouldChangeThis.trim()
      : "";
  return {
    recommendedOption,
    confidence,
    explanation,
    keyAssumptions,
    whatWouldChangeThis,
  };
}

function repairConsistency(raw: ConsistencyStepResult): ConsistencyResult {
  const status = raw.status === "contradiction" ? "contradiction" : "consistent";
  if (status === "consistent") return { status };
  const note =
    typeof raw.note === "string" && raw.note.trim()
      ? raw.note.trim()
      : "Review the recommendation against the scores.";
  return { status, note };
}

/** Mean score per option — the same figure the comparison table shows. */
function optionAverages(scoring: OptionScoring[]): OptionAverage[] {
  return scoring.map((s) => ({
    option: s.option,
    average: s.scores.length
      ? s.scores.reduce((acc, cur) => acc + cur.score, 0) / s.scores.length
      : 0,
  }));
}

/** Top two options by average and the gap between them, in tenths. */
function topTwoAverages(scoring: OptionScoring[]): {
  top: OptionAverage;
  runnerUp?: OptionAverage;
  gapTenths: number;
} {
  // Round averages to the precision the comparison table displays so the
  // verdict always matches what the user sees (e.g. 8.0 vs 7.7).
  const rounded = optionAverages(scoring).map((a) => ({
    option: a.option,
    average: Math.round(a.average * 10) / 10,
  }));
  const sorted = [...rounded].sort((a, b) => b.average - a.average);
  const top = sorted[0];
  const runnerUp = sorted[1];
  return {
    top,
    runnerUp,
    gapTenths: runnerUp
      ? Math.round(top.average * 10) - Math.round(runnerUp.average * 10)
      : Number.POSITIVE_INFINITY,
  };
}

/**
 * Decides the consistency verdict against the VISIBLE average scores. The
 * average gap is the source of truth for closeness — an LLM's subjective
 * "gap too small" judgment is unreliable, so it is overridden here:
 *  - gapTenths < NEAR_TIE_GAP_TENTHS    → genuine near-tie, flagged for review
 *  - gapTenths >= CLEAR_LEAD_GAP_TENTHS → clear leader, never flagged
 *  - otherwise                          → auditor's verdict (borderline band)
 */
function decideConsistency(
  raw: ConsistencyStepResult,
  top: OptionAverage,
  runnerUp: OptionAverage | undefined,
  gapTenths: number,
): ConsistencyResult {
  if (runnerUp && gapTenths < NEAR_TIE_GAP_TENTHS) {
    return {
      status: "contradiction",
      note: `${top.option} and ${runnerUp.option} have very close average scores (${top.average.toFixed(1)} vs ${runnerUp.average.toFixed(1)}), so treat this recommendation as a close call rather than a clear winner.`,
    };
  }
  if (gapTenths >= CLEAR_LEAD_GAP_TENTHS) {
    return { status: "consistent" };
  }
  return repairConsistency(raw);
}

// ---------------------------------------------------------------------------
// The 4-step chain
// ---------------------------------------------------------------------------

async function runAnalysis(input: ValidatedInput): Promise<DecisionBrief> {
  // Step 1 — generate criteria only when the user left them blank.
  let criteria = input.criteria;
  if (criteria.length === 0) {
    const result = await withRetry("criteria generation", () =>
      generateJson<CriteriaStepResult>(
        generateCriteriaPrompt(input.decisionQuestion, input.options),
      )
    );
    criteria = normalizeCriteria(result.criteria ?? []);
    if (criteria.length === 0) {
      throw new Error("Criteria generation returned no criteria");
    }
  }

  // Step 2 — hybrid-batched scoring: one call per option (2-4 calls, run in
  // parallel), each scoring ALL criteria in a single structured response.
  const scoring = await Promise.all(
    input.options.map((option) =>
      withRetry(`scoring option "${option}"`, async () => {
        const raw = await generateJson<ScoringStepResult>(
          scoreOptionPrompt(input.decisionQuestion, option, criteria),
        );
        return repairOptionScoring(option, criteria, raw);
      })
    ),
  );

  // Step 3 — recommendation synthesis from the complete matrix.
  const recommendationRaw = await withRetry("recommendation synthesis", () =>
    generateJson<RecommendationStepResult>(
      synthesizeRecommendationPrompt(
        input.decisionQuestion,
        input.options,
        criteria,
        scoring,
      ),
    )
  );
  const recommendation = repairRecommendation(input.options, scoring, recommendationRaw);

  // Step 4 — independent consistency check. The verdict is decided against the
  // average scores the comparison table shows: the deterministic average-gap
  // rule in decideConsistency overrides the auditor's closeness judgment, and
  // the prompt receives the same averages so it evaluates claims against them.
  const { top, runnerUp, gapTenths } = topTwoAverages(scoring);
  const consistencyRaw = await withRetry("consistency check", () =>
    generateJson<ConsistencyStepResult>(
      consistencyCheckPrompt(
        input.decisionQuestion,
        criteria,
        scoring,
        recommendation,
        optionAverages(scoring),
      ),
    )
  );
  const consistency = decideConsistency(consistencyRaw, top, runnerUp, gapTenths);

  return { criteria, scoring, recommendation, consistency };
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const input = validateInput(body);
  if ("error" in input) {
    return json({ error: input.error }, 400);
  }

  try {
    const brief = await runAnalysis(input);
    return json(brief, 200);
  } catch (err) {
    console.error("[analyze-decision] chain failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return json({ error: "Analysis failed — please try again", detail }, 502);
  }
});
