"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/", label: "The garden", short: "Garden", match: (p: string) => p === "/" },
  {
    href: "/plots",
    label: "The plots",
    short: "Plots",
    match: (p: string) => p.startsWith("/plots"),
  },
  {
    href: "/work",
    label: "The workshop",
    short: "Workshop",
    match: (p: string) => p.startsWith("/work"),
  },
  { href: "/about", label: "About", short: "About", match: (p: string) => p === "/about" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-bg">
      <div className="mx-auto flex flex-wrap items-center justify-between gap-3 px-[clamp(24px,5vw,120px)] py-4">
        <Link
          href="/"
          className="label-mono whitespace-nowrap tracking-[0.1em] sm:tracking-[0.16em] text-ink"
        >
          Matthew Rizky Hartadi
        </Link>
        <nav className="flex flex-wrap items-center gap-4 sm:gap-[clamp(16px,2.4vw,30px)]">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navlink label-mono tracking-[0.08em] sm:tracking-[0.14em] transition-colors duration-300 ${
                  active ? "text-ink" : "text-faint hover:text-[#b0573f]"
                }`}
              >
                {/* The article is a desktop flourish: "The" three times over is 12
                    characters of a 342px column, and it is what pushed the nav onto a
                    third row. Both labels are in the DOM; display:none keeps the hidden
                    one out of the accessibility tree, so nothing is announced twice. */}
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
