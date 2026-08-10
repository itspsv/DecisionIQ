import { supabase } from "./supabase";
import type { AnalyzeDecisionRequest, DecisionBrief } from "./types";

type FailureKind = "invalid" | "network" | "server";

const FRIENDLY_MESSAGES: Record<FailureKind, string> = {
  invalid:
    "We couldn’t analyze that decision — try rephrasing your question or adjusting your options.",
  network:
    "We couldn’t reach the analysis service — check your connection and try again.",
  server:
    "The analysis service hit a snag. Please try again in a moment.",
};

export class AnalysisError extends Error {
  readonly kind: FailureKind;

  constructor(message: string, kind: FailureKind) {
    super(message);
    this.name = "AnalysisError";
    this.kind = kind;
  }
}

function classify(error: unknown): FailureKind {
  const err = error as { context?: { status?: number } } | undefined;
  if (typeof err?.context?.status === "number") {
    const status = err.context.status;
    return status >= 400 && status < 500 ? "invalid" : "server";
  }
  // A fetch-level failure (DNS, timeout, CORS) — transient by nature.
  return "network";
}

/**
 * Invokes the `analyze-decision` Edge Function with one automatic retry for
 * transient failures. Non-2xx responses from our own function are surfaced
 * as friendly, actionable messages — never raw error codes.
 */
export async function analyzeDecision(
  input: AnalyzeDecisionRequest,
): Promise<DecisionBrief> {
  const attempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke<DecisionBrief>(
        "analyze-decision",
        { body: input },
      );

      if (error) {
        const kind = classify(error);
        throw new AnalysisError(FRIENDLY_MESSAGES[kind], kind);
      }
      if (!data) {
        throw new AnalysisError(FRIENDLY_MESSAGES.server, "server");
      }
      return data;
    } catch (err) {
      lastError = err;
      // Don't waste a retry on a deterministic "invalid input" response.
      if (err instanceof AnalysisError && err.kind === "invalid") {
        throw err;
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new AnalysisError(FRIENDLY_MESSAGES.server, "server");
}
