import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ConsistencyResult } from "../lib/types";

export default function ValidationBadge({
  consistency,
}: {
  consistency: ConsistencyResult;
}) {
  const ok = consistency.status === "consistent";

  return (
    <p
      role="status"
      className={`inline-flex max-w-full items-start gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
        ok
          ? "border-success/25 bg-success/10 text-success"
          : "border-warning/25 bg-warning/10 text-warning"
      }`}
    >
      {ok ? (
        <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>
        {ok
          ? "Consistency verified — the scoring lines up with the recommendation."
          : `Review needed${consistency.note ? ` — ${consistency.note}` : ""}`}
      </span>
    </p>
  );
}
