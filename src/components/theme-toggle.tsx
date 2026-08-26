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
      /* Below sm the label is display:none and the 10x10 pip IS the control, so
         this needs horizontal slop as well as vertical -- py-2 alone would leave
         a 26x10 target. The negative margins keep the header's height and the
         nav's spacing exactly as they were. */
      className="label-mono -mx-2 -my-2 flex cursor-pointer items-center gap-2 px-2 py-2 tracking-[0.08em] sm:tracking-[0.14em] text-faint transition-colors duration-300 hover:text-[#b0573f]"
      aria-label="Toggle dark mode"
    >
      <m.span
        initial="rest"
        whileHover="hover"
        variants={togglePipVariants}
        className="h-[10px] w-[10px] rounded-full border border-ink"
        style={{ background: isDark ? "#f4efe6" : "#221f1b" }}
      />
      {/* Below sm the pip is the whole control. The button already carries an
          aria-label, so dropping the word costs nothing to a screen reader —
          and a display:none span is not a flex item, so the gap-2 collapses
          with it. */}
      <span className="hidden sm:inline">
        {mounted ? (isDark ? "Light" : "Dark") : "Dark"}
      </span>
    </button>
  );
}
