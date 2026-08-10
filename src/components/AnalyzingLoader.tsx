import { useEffect, useState } from "react";

const PHASES = [
  "Analyzing your decision…",
  "Weighing your options…",
  "Cross-checking consistency…",
];

const PHASE_INTERVAL_MS = 2800;

export default function AnalyzingLoader() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setPhase((p) => (p + 1) % PHASES.length),
      PHASE_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface px-6 py-12 text-center shadow-card"
    >
      <span aria-hidden className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-[3px] border-primary/15" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary motion-reduce:animate-none" />
        <span className="h-2 w-2 rounded-full bg-primary motion-reduce:animate-pulse" />
      </span>
      <div>
        <p className="font-heading text-base font-semibold text-foreground">
          {PHASES[phase]}
        </p>
        <p className="mt-1 text-sm text-muted">
          Usually takes 10–30 seconds — keep this tab open.
        </p>
      </div>
    </div>
  );
}
