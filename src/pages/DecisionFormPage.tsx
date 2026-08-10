import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Plus, X } from "lucide-react";
import Wordmark from "../components/Wordmark";
import AnalyzingLoader from "../components/AnalyzingLoader";
import { analyzeDecision } from "../lib/analyze";
import { saveDecision } from "../lib/storage";
import {
  cleanCriteria,
  cleanOptions,
  validateDecisionInput,
  MAX_CRITERIA,
  MAX_OPTIONS,
} from "../lib/validation";
import type { ValidationErrors } from "../lib/validation";
import type { AnalyzeDecisionRequest } from "../lib/types";

const INITIAL_OPTIONS = ["", "", ""];
const INITIAL_CRITERIA = ["", ""];

export default function DecisionFormPage() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(INITIAL_OPTIONS);
  const [criteria, setCriteria] = useState<string[]>(INITIAL_CRITERIA);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  function updateList(
    list: string[],
    setList: (next: string[]) => void,
    index: number,
    value: string,
  ) {
    const next = [...list];
    next[index] = value;
    setList(next);
    setErrors({});
    setBanner(null);
  }

  function removeFromList(
    list: string[],
    setList: (next: string[]) => void,
    index: number,
  ) {
    setList(list.filter((_, i) => i !== index));
    setErrors({});
  }

  function addToList(setList: Dispatch<SetStateAction<string[]>>) {
    setList((prev) => [...prev, ""]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validateDecisionInput(question, options);
    setErrors(validation);
    if (validation.question || validation.options) return;

    const input: AnalyzeDecisionRequest = {
      decisionQuestion: question.trim(),
      options: cleanOptions(options),
      criteria: cleanCriteria(criteria),
    };

    setAnalyzing(true);
    setBanner(null);
    try {
      const brief = await analyzeDecision(input);
      saveDecision({
        input,
        brief,
        createdAt: new Date().toISOString(),
      });
      navigate("/results");
    } catch (err) {
      setBanner(
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing your decision. Please try again.",
      );
      setAnalyzing(false);
    }
  }

  const questionHasError = Boolean(errors.question);
  const optionsHaveError = Boolean(errors.options);

  return (
    <div className="min-h-screen">
      <Wordmark tagline="Structured decision intelligence" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Make a better decision, faster.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Describe a decision and your options. DecisionIQ scores each one,
          explains why, and double-checks its own recommendation before showing
          it to you. Reasoning you can actually trust, not just an answer.
        </p>

        {banner && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
          >
            <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p>{banner}</p>
              <p className="mt-0.5 font-normal text-danger/80">
                Your input is still here — nothing was lost.
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={analyzing}
          className="mt-8 space-y-6"
        >
          <fieldset disabled={analyzing} className="space-y-6">
            <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
              <label
                htmlFor="question"
                className="block font-semibold text-foreground"
              >
                What decision are you making?
              </label>
              <textarea
                id="question"
                rows={3}
                maxLength={200}
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setErrors({});
                  setBanner(null);
                }}
                placeholder="e.g. Should we migrate our database to Postgres or stick with MySQL?"
                aria-invalid={questionHasError}
                aria-describedby={
                  questionHasError ? "question-error" : "question-hint"
                }
                className={`mt-2 w-full resize-none rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 transition-colors duration-150 focus:outline-none ${
                  questionHasError
                    ? "border-danger focus:border-danger"
                    : "border-border focus:border-primary"
                }`}
              />
              {questionHasError ? (
                <p id="question-error" className="mt-1.5 text-sm text-danger">
                  {errors.question}
                </p>
              ) : (
                <p id="question-hint" className="mt-1.5 text-xs text-muted">
                  Be specific — a little context helps the analysis.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-foreground">
                  Options{" "}
                  <span className="font-normal text-muted">(2–4)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => addToList(setOptions)}
                  disabled={options.length >= MAX_OPTIONS}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-primary transition-colors duration-150 hover:border-primary/40 hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-40"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  Add another option
                </button>
              </div>
              <ul className="mt-4 space-y-2">
                {options.map((option, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-semibold text-primary"
                    >
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      maxLength={120}
                      value={option}
                      onChange={(e) =>
                        updateList(options, setOptions, i, e.target.value)
                      }
                      placeholder={
                        i === 0
                          ? "e.g. Postgres"
                          : i === 1
                            ? "e.g. Stay on MySQL"
                            : `Option ${i + 1}`
                      }
                      aria-label={`Option ${i + 1}`}
                      className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 transition-colors duration-150 focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeFromList(options, setOptions, i)}
                      disabled={options.length <= 1}
                      aria-label={`Remove option ${i + 1}`}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                    >
                      <X aria-hidden className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {optionsHaveError && (
                <p className="mt-2 text-sm text-danger">{errors.options}</p>
              )}
              {options.length >= MAX_OPTIONS && (
                <p className="mt-2 text-xs text-muted">
                  Maximum of {MAX_OPTIONS} options — remove one to add another.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-foreground">
                  Criteria{" "}
                  <span className="font-normal text-muted">
                    (optional, up to {MAX_CRITERIA})
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => addToList(setCriteria)}
                  disabled={criteria.length >= MAX_CRITERIA}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-primary transition-colors duration-150 hover:border-primary/40 hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-40"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  Add criterion
                </button>
              </div>
              <p className="mt-1 text-sm text-muted">
                Not sure what matters most? Leave this blank and DecisionIQ will
                suggest criteria for you.
              </p>
              {criteria.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {criteria.map((criterion, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={80}
                        value={criterion}
                        onChange={(e) =>
                          updateList(criteria, setCriteria, i, e.target.value)
                        }
                        placeholder="e.g. Migration cost, query performance, team familiarity"
                        aria-label={`Criterion ${i + 1}`}
                        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 transition-colors duration-150 focus:border-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeFromList(criteria, setCriteria, i)
                        }
                        aria-label={`Remove criterion ${i + 1}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
                      >
                        <X aria-hidden className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-lg bg-card px-3.5 py-3 text-sm text-muted">
                  No criteria yet — add some to steer the analysis, or run it
                  as-is and let DecisionIQ choose.
                </p>
              )}
            </section>
          </fieldset>

          {analyzing ? (
            <AnalyzingLoader />
          ) : (
            <button type="submit" className="btn-primary w-full">
              Analyze decision
              <ArrowRight aria-hidden className="h-4 w-4" />
            </button>
          )}

          <p className="text-center text-xs text-muted">
            Scores are AI-generated estimates — use your judgment for
            high-stakes decisions.
          </p>
        </form>
      </main>
    </div>
  );
}
