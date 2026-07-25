import type { ResultFigure } from "@/lib/types";

/** A single restrained row of results — figures at the entry-num scale,
 * mono captions beneath, separated by hairline rules. Deliberately not a
 * full-bleed stats band. Renders nothing when there are no results. */
export function ResultFigures({ results }: { results: ResultFigure[] }) {
  if (results.length === 0) return null;

  return (
    <div className="mt-[clamp(20px,2.5vw,28px)] flex flex-col gap-5 border-b border-hair pb-[clamp(20px,2.5vw,28px)] sm:flex-row sm:flex-wrap sm:gap-0">
      {results.map((result, index) => (
        <div
          key={index}
          className="min-w-0 border-rule px-0 sm:border-r sm:px-[clamp(20px,3vw,36px)] sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
        >
          <div className="result-num">{result.figure}</div>
          <div className="label-mono mt-2 tracking-[0.1em] text-faint">
            {result.caption}
          </div>
        </div>
      ))}
    </div>
  );
}
