import { CV } from "@/lib/me";

export function SiteFooter() {
  return (
    <footer className="label-mono grid grid-cols-2 items-baseline gap-x-6 gap-y-2 px-[clamp(24px,6vw,120px)] pb-[clamp(40px,5vw,60px)] text-[10px] tracking-[0.14em] text-faint sm:flex sm:flex-wrap sm:justify-between sm:gap-3">
      <span className="col-span-2 sm:col-span-1">Tended by hand · Brisbane</span>
      <a href={CV.href} download className="navlink text-gardener">
        {CV.label}
      </a>
      <span>© 2026 M.R.H</span>
    </footer>
  );
}
