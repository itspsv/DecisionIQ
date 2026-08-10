import type { AnalyzeDecisionRequest, DecisionBrief } from "./types";

const STORAGE_KEY = "decisioniq:lastBrief";

export interface StoredDecision {
  input: AnalyzeDecisionRequest;
  brief: DecisionBrief;
  createdAt: string;
}

export function saveDecision(record: StoredDecision): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable (private mode / quota) — analysis still works, it
    // just won't persist across a reload.
  }
}

export function loadDecision(): StoredDecision | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredDecision(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDecision(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function isStoredDecision(value: unknown): value is StoredDecision {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.createdAt !== "string") return false;
  if (!record.input || typeof record.input !== "object") return false;

  const brief = record.brief as Record<string, unknown> | undefined;
  if (!brief || typeof brief !== "object") return false;
  if (!Array.isArray(brief.criteria) || !Array.isArray(brief.scoring)) {
    return false;
  }
  const rec = brief.recommendation as Record<string, unknown> | undefined;
  return (
    !!rec &&
    typeof rec.recommendedOption === "string" &&
    typeof rec.confidence === "string" &&
    typeof rec.explanation === "string"
  );
}
