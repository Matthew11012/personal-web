// Same tab-button-row pattern as training/range-control.tsx, but generalized
// to an arbitrary option list: GitHub year options are dynamic (computed from
// the account's join year at fetch time in src/lib/github.ts), not a fixed
// literal union like RangePreset.
export function GithubRangeControl({
  options,
  selected,
  onChange,
}: {
  options: { key: string; label: string }[];
  selected: string;
  onChange: (key: string) => void;
}) {
  return (
    <div role="group" aria-label="Contribution period" className="flex flex-wrap gap-5">
      {options.map((option) => {
        const active = option.key === selected;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            className={`label-mono cursor-pointer border-b tracking-[0.1em] transition-colors duration-300 ${
              active
                ? "border-current text-[var(--acc)]"
                : "border-transparent text-dim hover:text-[var(--acc)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
