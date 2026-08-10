// Shared shapes for the analyze-decision Edge Function.
// These mirror the response shapes required by the PRD so the client
// and the function stay in sync.

export type Confidence = "High" | "Medium" | "Low";

export interface ScoreEntry {
  criterion: string;
  /** Integer score from 1 (worst) to 10 (best). */
  score: number;
  /** One-sentence justification for the score. */
  justification: string;
}

export interface OptionScoring {
  option: string;
  scores: ScoreEntry[];
}

/** Mean score per option — the same figure the comparison table shows. */
export interface OptionAverage {
  option: string;
  average: number;
}

export interface Recommendation {
  recommendedOption: string;
  confidence: Confidence;
  explanation: string;
  keyAssumptions: string[];
  whatWouldChangeThis: string;
}

export interface ConsistencyResult {
  status: "consistent" | "contradiction";
  note?: string;
}

export interface DecisionBrief {
  criteria: string[];
  scoring: OptionScoring[];
  recommendation: Recommendation;
  consistency: ConsistencyResult;
}

export interface AnalyzeDecisionRequest {
  decisionQuestion: string;
  options: string[];
  criteria: string[];
}

// --- Intermediate AI-step shapes (before repair) ---

export interface CriteriaStepResult {
  criteria: string[];
}

export interface ScoringStepResult {
  option?: string;
  scores?: unknown[];
}

export interface RecommendationStepResult {
  recommendedOption?: string;
  confidence?: unknown;
  explanation?: string;
  keyAssumptions?: unknown;
  whatWouldChangeThis?: string;
}

export interface ConsistencyStepResult {
  status?: unknown;
  note?: unknown;
}
