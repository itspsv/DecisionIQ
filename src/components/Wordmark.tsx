import { Scale } from "lucide-react";

export default function Wordmark({ tagline }: { tagline?: string }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-4 py-4 sm:px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <Scale aria-hidden className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="font-heading text-lg font-bold tracking-tight text-foreground">
            DecisionIQ
          </p>
          {tagline && <p className="text-xs text-muted">{tagline}</p>}
        </div>
      </div>
    </header>
  );
}
