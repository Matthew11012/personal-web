"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { m } from "motion/react";
import { togglePipVariants } from "@/lib/motion";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Documented next-themes pattern: gate theme-dependent UI until after
  // hydration to avoid a server/client mismatch (theme is unknown on the
  // server).
  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="label-mono flex cursor-pointer items-center gap-2 tracking-[0.14em] text-faint transition-colors duration-300 hover:text-[#b0573f]"
      aria-label="Toggle dark mode"
    >
      <m.span
        initial="rest"
        whileHover="hover"
        variants={togglePipVariants}
        className="h-[10px] w-[10px] rounded-full border border-ink"
        style={{ background: isDark ? "#f4efe6" : "#221f1b" }}
      />
      {mounted ? (isDark ? "Light" : "Dark") : "Dark"}
    </button>
  );
}
