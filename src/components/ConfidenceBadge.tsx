import { AlertTriangle, CheckCircle2, Equal } from "lucide-react";
import type { Confidence } from "../lib/types";

const CONFIG: Record<
  Confidence,
  { icon: typeof CheckCircle2; label: string; classes: string }
> = {
  High: {
    icon: CheckCircle2,
    label: "High confidence",
    classes: "border-success/25 bg-success/10 text-success",
  },
  Medium: {
    icon: Equal,
    label: "Medium confidence",
    classes: "border-warning/25 bg-warning/10 text-warning",
  },
  Low: {
    icon: AlertTriangle,
    label: "Low confidence",
    classes: "border-danger/25 bg-danger/10 text-danger",
  },
};

export default function ConfidenceBadge({
  confidence,
}: {
  confidence: Confidence;
}) {
  const { icon: Icon, label, classes } = CONFIG[confidence];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${classes}`}
    >
      <Icon aria-hidden className="h-4 w-4" />
      {label}
    </span>
  );
}
