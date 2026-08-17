export interface InspectorRow {
  label: string; // "swim"
  hours: string; // "1.2h" — already formatted by the caller
  distance: string; // "3.1 km" — already formatted by the caller
}

/** Shared readout for the training charts: an idle headline summarising the
 * whole range, or a per-week/per-day breakdown once something is active.
 * Purely presentational — the caller owns all state and formatting, this
 * only lays it out. Shared by weekly-volume now, the home band and the
 * heatmap later, so the props stay serialisable and chart-agnostic. */
export function ChartInspector({
  headline,
  rows,
}: {
  headline: string;
  rows?: InspectorRow[];
}) {
  return (
    // min-h reserves the worst case (headline + up to three stacked rows on
    // narrow screens, or headline + one wrapped row of three on sm+) so
    // hovering between the idle and active states never reflows the page.
    <div className="mt-2 min-h-[92px] border-t border-rule pt-3 sm:min-h-[52px]">
      {/* tabular-nums throughout: these figures change on every arrow key and
          every hover, and proportional digits make the whole line shuffle
          sideways as they do. */}
      <div aria-live="polite" className="tabular-nums">
        <p className="label-mono tracking-[0.1em] text-dim">{headline}</p>
        {rows && rows.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
            {rows.map((row) => (
              <div key={row.label} className="label-mono flex gap-2 tracking-[0.1em]">
                <span className="text-faint">{row.label}</span>
                <span className="text-dim">{row.hours}</span>
                <span className="text-dim">{row.distance}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
