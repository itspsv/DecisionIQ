import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Scale } from "lucide-react";
import Wordmark from "../components/Wordmark";
import ConfidenceBadge from "../components/ConfidenceBadge";
import ValidationBadge from "../components/ValidationBadge";
import OptionAvatar from "../components/OptionAvatar";
import ComparisonTable from "../components/ComparisonTable";
import KeyAssumptions from "../components/KeyAssumptions";
import WhatWouldChangeCallout from "../components/WhatWouldChangeCallout";
import { loadDecision, type StoredDecision } from "../lib/storage";
import { applyNearTieGuard } from "../lib/brief";

export default function ResultsPage() {
  const navigate = useNavigate();
  const [record] = useState<StoredDecision | null>(() => loadDecision());

  if (!record) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Scale aria-hidden className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-bold text-foreground">
          No analysis here yet
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Your decision brief appears here after the analysis finishes. Run a
          decision through DecisionIQ to see one.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="btn-primary mt-6"
        >
          Start a new decision
          <ArrowRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const { input, brief: rawBrief } = record;
  const { brief, nearTie } = applyNearTieGuard(rawBrief);
  const rec = brief.recommendation;

  return (
    <div className="min-h-screen">
      <Wordmark tagline="Decision brief" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted transition-colors duration-150 hover:bg-card hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          New decision
        </button>

        <p className="mt-4 text-sm text-muted">
          Decision:{" "}
          <span className="font-medium text-foreground">
            {input.decisionQuestion}
          </span>
        </p>

        <section className="mt-3 rounded-xl border border-border bg-surface p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <OptionAvatar name={rec.recommendedOption} size="lg" />
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {rec.recommendedOption}
              </h1>
              <ConfidenceBadge confidence={rec.confidence} />
              {nearTie && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-sm font-semibold text-warning">
                  <Scale aria-hidden className="h-4 w-4" />
                  Closely matched
                </span>
              )}
            </div>
          </div>
          <p className="mt-4 text-base leading-relaxed text-foreground/90">
            {rec.explanation}
          </p>
          <div className="mt-5">
            <ValidationBadge consistency={brief.consistency} />
          </div>
        </section>

        <section aria-labelledby="comparison-heading" className="mt-10">
          <h2
            id="comparison-heading"
            className="font-heading text-lg font-semibold text-foreground"
          >
            How the options compare
          </h2>
          <p className="mt-1 text-sm text-muted">
            Scores run 1–10 per criterion. Hover a score to see the reasoning
            (tap on mobile).
          </p>
          <div className="mt-4">
            <ComparisonTable brief={brief} />
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <KeyAssumptions assumptions={rec.keyAssumptions} />
          <WhatWouldChangeCallout text={rec.whatWouldChangeThis} />
        </div>

        <p className="mt-10 text-center text-xs text-muted">
          Scores are AI-generated estimates — use your judgment for high-stakes
          decisions.
        </p>
      </main>
    </div>
  );
}
