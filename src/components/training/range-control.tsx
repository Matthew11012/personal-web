import { RANGE_PRESETS } from "@/lib/training-derive";
import type { RangePreset } from "@/lib/types";

// RANGE_PRESETS carries the longer copy ("Year to date", "All time") used
// elsewhere; this control needs terse labels, so it maps rather than
// mutating the shared constant's meaning.
const SHORT_LABELS: Record<RangePreset, string> = {
  all: "All",
  ytd: "YTD",
  "12w": "12w",
  "4w": "4w",
};

// Display order (widest to narrowest window) — RANGE_PRESETS itself is
// declared narrowest-first, for the derive layer's own purposes.
const DISPLAY_WEIGHT: Record<RangePreset, number> = { all: 0, ytd: 1, "12w": 2, "4w": 3 };
const orderedPresets = [...RANGE_PRESETS].sort(
  (a, b) => DISPLAY_WEIGHT[a.value] - DISPLAY_WEIGHT[b.value],
);

export function RangeControl({
  range,
  onChange,
}: {
  range: RangePreset;
  onChange: (range: RangePreset) => void;
}) {
  return (
    <div role="group" aria-label="Date range" className="flex gap-5">
      {orderedPresets.map((preset) => {
        const active = preset.value === range;
        return (
          <button
            key={preset.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(preset.value)}
            className={`label-mono cursor-pointer border-b tracking-[0.1em] transition-colors duration-300 ${
              active
                ? "border-current text-[var(--acc)]"
                : "border-transparent text-dim hover:text-[var(--acc)]"
            }`}
          >
            {SHORT_LABELS[preset.value]}
          </button>
        );
      })}
    </div>
  );
}
