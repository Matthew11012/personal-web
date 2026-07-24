import type { Stage } from "@/lib/types";

const DEGREES: Record<Stage, number | null> = {
  seedling: 120,
  budding: 240,
  evergreen: null, // solid fill
};

export function StagePip({
  stage,
  accent,
  className = "",
}: {
  stage: Stage;
  accent: string;
  className?: string;
}) {
  const degrees = DEGREES[stage];
  const background =
    degrees === null ? accent : `conic-gradient(${accent} ${degrees}deg, #d8d1c3 0)`;

  return (
    <span
      className={`inline-block h-[9px] w-[9px] rounded-full ${className}`}
      style={{ background }}
    />
  );
}

export const STAGE_LABEL: Record<Stage, string> = {
  seedling: "Seedling",
  budding: "Budding",
  evergreen: "Evergreen",
};

export const STAGE_SYMBOL: Record<Stage, string> = {
  seedling: "●",
  budding: "◐",
  evergreen: "◍",
};
