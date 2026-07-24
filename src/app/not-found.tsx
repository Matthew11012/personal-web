import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start px-[clamp(24px,6vw,120px)] py-[clamp(70px,10vw,140px)]">
      <div className="label-mono mb-6 tracking-[0.28em] text-faint">
        Untended plot
      </div>
      <h1 className="display-lg text-ink">This bed hasn&rsquo;t been dug yet.</h1>
      <p className="lede mt-6 max-w-[34ch] text-dim">
        Nothing has grown here — the page you&rsquo;re looking for doesn&rsquo;t
        exist, or hasn&rsquo;t been planted.
      </p>
      <Link
        href="/"
        className="navlink label-mono mt-10 inline-flex gap-2 tracking-[0.18em] text-ink"
      >
        ← Back to the garden
      </Link>
    </div>
  );
}
