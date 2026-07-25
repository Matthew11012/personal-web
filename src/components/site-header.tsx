"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/", label: "The garden", match: (p: string) => p === "/" },
  {
    href: "/plots",
    label: "The plots",
    match: (p: string) => p.startsWith("/plots"),
  },
  {
    href: "/work",
    label: "The workshop",
    match: (p: string) => p.startsWith("/work"),
  },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-bg">
      <div className="mx-auto flex flex-wrap items-center justify-between gap-3 px-[clamp(24px,5vw,120px)] py-4">
        <Link
          href="/"
          className="label-mono whitespace-nowrap tracking-[0.16em] text-ink"
        >
          Matthew Rizky Hartadi
        </Link>
        <nav className="flex flex-wrap items-center gap-[clamp(16px,2.4vw,30px)]">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navlink label-mono tracking-[0.14em] transition-colors duration-300 ${
                  active ? "text-ink" : "text-faint hover:text-[#b0573f]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
