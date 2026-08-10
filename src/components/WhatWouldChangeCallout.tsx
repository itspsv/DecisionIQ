import { Lightbulb } from "lucide-react";

export default function WhatWouldChangeCallout({ text }: { text: string }) {
  return (
    <section
      aria-labelledby="what-would-change-heading"
      className="rounded-xl border border-primary/20 bg-primary-soft p-6 shadow-card"
    >
      <h2
        id="what-would-change-heading"
        className="flex items-center gap-2 font-heading text-lg font-semibold text-primary"
      >
        <Lightbulb aria-hidden className="h-5 w-5" />
        What would change this?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground">
        {text ||
          "No specific triggers were identified — this recommendation looks fairly stable."}
      </p>
    </section>
  );
}
