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
    // min-h reserves the tallest state so moving between idle and active never
    // reflows the page. Measured, not estimated: one line is 16.5px, and the
    // worst case is a headline plus two rows of discipline figures (12px
    // pt-3 + 16.5 + 8 mt-2 + 2x16.5 + 4 gap = 74px), with sm+ collapsing to a
    // headline plus one wrapped row.
    <div className="mt-2 min-h-[76px] border-t border-rule pt-3 sm:min-h-[52px]">
      {/* tabular-nums throughout: these figures change on every arrow key and
          every hover, and proportional digits make the whole line shuffle
          sideways as they do. */}
      <div aria-live="polite" className="tabular-nums">
        <p className="label-mono tracking-[0.1em] text-dim">{headline}</p>
        {rows && rows.length > 0 && (
          // Two columns on narrow screens rather than three stacked rows:
          // stacking reserved ~92px, most of it empty in the idle state, which
          // read as a hole between the chart and whatever followed it.
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
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
