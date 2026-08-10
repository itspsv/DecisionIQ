import type { Confidence, DecisionBrief } from "./types";

export interface OptionAverage {
  option: string;
  average: number;
}

/** Average score per option across all criteria. */
export function optionAverages(brief: DecisionBrief): OptionAverage[] {
  return brief.scoring.map((scoring) => {
    const sum = scoring.scores.reduce((acc, s) => acc + s.score, 0);
    return {
      option: scoring.option,
      average: scoring.scores.length ? sum / scoring.scores.length : 0,
    };
  });
}

/**
 * Displayed average gap, in integer tenths of a point, below which the top
 * two options count as a genuine near-tie (gap < 0.3 as shown in the table,
 * e.g. 8.0 vs 7.8). Integer tenths avoid floating-point noise misclassifying
 * an exact 0.3 display gap (e.g. 8.0 vs 7.7) as a near-tie.
 */
const NEAR_TIE_GAP_TENTHS = 3;

export interface GuardedBrief {
  brief: DecisionBrief;
  nearTie: boolean;
}

/**
 * Defensive guard: if the top two options' average scores (the same figures
 * the comparison table shows) are within `NEAR_TIE_GAP_TENTHS` tenths of each
 * other, the recommendation is treated as guidance only — confidence drops to
 * Medium (never above it) and the explanation carries a neutral close-call
 * caveat. A clear leader (displayed gap 0.4+) is never flagged.
 */
export function applyNearTieGuard(brief: DecisionBrief): GuardedBrief {
  const averages = optionAverages(brief);
  if (averages.length < 2) return { brief, nearTie: false };

  // Round averages to the precision the comparison table displays so the
  // verdict always matches what the user sees (e.g. 8.0 vs 7.7).
  const sorted = averages
    .map((a) => ({ option: a.option, average: Math.round(a.average * 10) / 10 }))
    .sort((a, b) => b.average - a.average);
  const gapTenths =
    Math.round(sorted[0].average * 10) - Math.round(sorted[1].average * 10);
  const rec = brief.recommendation.recommendedOption;
  const recommendedIsTopTwo =
    sorted[0].option === rec || sorted[1].option === rec;

  if (gapTenths < NEAR_TIE_GAP_TENTHS && recommendedIsTopTwo) {
    const confidence: Confidence =
      brief.recommendation.confidence === "Low" ? "Low" : "Medium";
    const note = `${sorted[0].option} and ${sorted[1].option} have very close average scores (${sorted[0].average.toFixed(1)} vs ${sorted[1].average.toFixed(1)}), so treat this recommendation as a close call rather than a clear winner.`;
    const explanation = brief.recommendation.explanation
      ? `${brief.recommendation.explanation} ${note}`
      : note;

    return {
      nearTie: true,
      brief: {
        ...brief,
        recommendation: { ...brief.recommendation, confidence, explanation },
      },
    };
  }

  return { brief, nearTie: false };
}
