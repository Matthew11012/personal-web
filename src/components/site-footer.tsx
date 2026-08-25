import { CV } from "@/lib/me";

export function SiteFooter() {
  return (
    <footer className="label-mono flex flex-wrap justify-between gap-3 px-[clamp(24px,6vw,120px)] pb-[clamp(40px,5vw,60px)] text-[10px] tracking-[0.14em] text-faint">
      <span>Tended by hand · Brisbane / Jakarta</span>
      <a href={CV.href} download className="navlink text-gardener">
        {CV.label}
      </a>
      <span>© 2026 M.R.H</span>
    </footer>
  );
}
