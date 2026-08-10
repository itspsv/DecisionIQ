import { Scale } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Wordmark({ tagline }: { tagline?: string }) {
  return (
    <header className="border-b border-border bg-surface transition-colors duration-200">
      <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-4 py-4 sm:px-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <Scale aria-hidden className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-heading text-lg font-bold tracking-tight text-foreground">
            DecisionIQ
          </p>
          {tagline && <p className="truncate text-xs text-muted">{tagline}</p>}
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
