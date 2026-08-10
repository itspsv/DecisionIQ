import { Flag } from "lucide-react";

export default function KeyAssumptions({
  assumptions,
}: {
  assumptions: string[];
}) {
  return (
    <section
      aria-labelledby="assumptions-heading"
      className="rounded-xl border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="assumptions-heading"
        className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground"
      >
        <Flag aria-hidden className="h-5 w-5 text-primary" />
        Key assumptions
      </h2>
      <p className="mt-1 text-sm text-muted">
        What the recommendation quietly depends on.
      </p>
      {assumptions.length > 0 ? (
        <ul className="mt-4 space-y-2.5">
          {assumptions.map((assumption, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground"
            >
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary-soft text-[11px] font-semibold text-primary"
              >
                {i + 1}
              </span>
              {assumption}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          No assumptions were flagged — but every analysis rests on some. If
          anything here feels off, weigh it against your own knowledge.
        </p>
      )}
    </section>
  );
}
