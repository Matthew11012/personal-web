export function MetaStrip({
  items,
  border = "bottom",
}: {
  items: string[];
  border?: "top" | "bottom";
}) {
  const borderClass = border === "top" ? "border-t pt-3.5" : "border-b pb-3.5";

  return (
    <div
      className={`label-mono flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1.5 border-hair tracking-[0.18em] text-dim ${borderClass}`}
    >
      {items.map((item, i) => (
        <span key={item} className={i === 0 ? "text-ink" : undefined}>
          {item}
        </span>
      ))}
    </div>
  );
}
