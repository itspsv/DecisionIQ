import { Fragment, useMemo, useState } from "react";
import { CircleHelp } from "lucide-react";
import type { DecisionBrief } from "../lib/types";
import { optionAverages } from "../lib/brief";

interface ExpandedCell {
  crit: number;
  opt: number;
}

export default function ComparisonTable({ brief }: { brief: DecisionBrief }) {
  const [expanded, setExpanded] = useState<ExpandedCell | null>(null);
  const averages = useMemo(() => optionAverages(brief), [brief]);
  const recommended = brief.recommendation.recommendedOption;
  const maxAverage = Math.max(...averages.map((a) => a.average), 1);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <caption className="sr-only">
          Scores for each option by criterion, on a scale of 1 to 10
        </caption>
        <thead>
          <tr className="border-b border-border bg-card">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-semibold text-muted"
            >
              Criteria
            </th>
            {brief.scoring.map((scoring) => {
              const isTop = scoring.option === recommended;
              return (
                <th
                  key={scoring.option}
                  scope="col"
                  className="border-l border-border/70 px-4 py-3 text-left align-bottom"
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className={
                        isTop ? "font-semibold text-primary" : "font-medium"
                      }
                    >
                      {scoring.option}
                    </span>
                    {isTop && (
                      <span className="inline-flex rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold leading-4 text-white">
                        Top pick
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {brief.criteria.map((criterion, critIdx) => {
            const isExpanded =
              expanded !== null && expanded.crit === critIdx;
            return (
              <Fragment key={criterion}>
                <tr className="border-b border-border/70 last:border-b-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-surface px-4 py-3 text-left align-top font-medium text-foreground"
                  >
                    <span className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary-soft text-[11px] font-semibold text-primary"
                      >
                        {critIdx + 1}
                      </span>
                      {criterion}
                    </span>
                  </th>
                  {brief.scoring.map((scoring, optIdx) => {
                    const entry = scoring.scores.find(
                      (s) => s.criterion === criterion,
                    );
                    const score = entry?.score ?? 0;
                    const justification =
                      entry?.justification || "Not scored for this criterion.";
                    const isExpandedCell =
                      isExpanded && expanded.opt === optIdx;
                    return (
                      <td
                        key={scoring.option}
                        className="border-l border-border/70 px-1.5 py-1.5 align-top"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded(
                              isExpandedCell ? null : { crit: critIdx, opt: optIdx },
                            )
                          }
                          aria-expanded={isExpandedCell}
                          aria-label={`${scoring.option}, ${criterion}: ${score} out of 10. ${justification}`}
                          className="group relative flex w-full items-center justify-between gap-1 rounded-lg px-2.5 py-2 transition-colors duration-150 ease-out hover:bg-card active:scale-[0.97]"
                        >
                          <span className="text-base font-semibold tabular-nums text-foreground">
                            {score}
                          </span>
                          <CircleHelp
                            aria-hidden
                            className="h-3.5 w-3.5 shrink-0 text-muted/50 transition-colors duration-150 group-hover:text-muted"
                          />
                          {/* Desktop hover tooltip */}
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-60 -translate-x-1/2 rounded-lg border border-border bg-foreground px-3 py-2 text-left text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 md:block"
                          >
                            {justification}
                          </span>
                        </button>
                        {/* Mobile tap-to-expand */}
                        {isExpandedCell && (
                          <p className="mx-1 mb-1 rounded-lg bg-card px-2.5 py-2 text-xs leading-relaxed text-muted md:hidden">
                            {justification}
                          </p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            );
          })}
          <tr className="border-t-2 border-border bg-card">
            <th
              scope="row"
              className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-semibold text-foreground"
            >
              Average
            </th>
            {averages.map((avg) => {
              const isTop = avg.option === recommended;
              return (
                <td
                  key={avg.option}
                  className="border-l border-border/70 px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-base font-bold tabular-nums ${
                        isTop ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {avg.average.toFixed(1)}
                    </span>
                    <span
                      aria-hidden
                      className="h-1.5 w-12 overflow-hidden rounded-full bg-border/70"
                    >
                      <span
                        className={`block h-full rounded-full ${
                          isTop ? "bg-primary" : "bg-muted/40"
                        }`}
                        style={{
                          width: `${Math.max((avg.average / maxAverage) * 100, 5)}%`,
                        }}
                      />
                    </span>
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
