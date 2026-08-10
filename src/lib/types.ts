// Client-side mirror of supabase/functions/analyze-decision/types.ts

export type Confidence = "High" | "Medium" | "Low";

export interface ScoreEntry {
  criterion: string;
  score: number;
  justification: string;
}

export interface OptionScoring {
  option: string;
  scores: ScoreEntry[];
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
