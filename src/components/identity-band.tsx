import Image from "next/image";
import Link from "next/link";
import { CredentialsStrip } from "@/components/credentials-strip";
import { GARDENER_ACCENT as ACCENT } from "@/lib/me";

/** The compact stand-in for the scroll-driven route on the homepage: same
    eyebrow and voice, none of the scroll machinery. Portrait sits in the
    hero's empty right column so the two read as one spread at 1440. */
export function IdentityBand() {
  return (
    <section
      aria-label="About Matthew"
      className="mt-[clamp(24px,4vw,56px)]"
    >
      <div className="label-mono flex justify-between border-b border-hair pb-3 tracking-[0.28em] text-faint">
        <span style={{ color: ACCENT }}>The gardener</span>
        <span>Two cities, two degrees</span>
      </div>

      <div className="mt-[clamp(28px,4vw,48px)] grid grid-cols-1 gap-[clamp(24px,4vw,40px)] md:grid-cols-[minmax(0,1fr)_minmax(0,clamp(140px,16vw,200px))] md:items-end">
        <div className="about-body max-w-[52ch] text-ink">
          <p className="mb-4">
            I&rsquo;m Matthew — a grad student and engineer working on
            retrieval and applied AI, splitting life between Jakarta and
            Brisbane. Most of what I know I learned twice: once in a lab,
            once somewhere with a heart-rate monitor on.
          </p>
          <Link
            href="/about"
            className="navlink label-mono inline-flex tracking-[0.18em]"
            style={{ color: ACCENT }}
          >
            The long version →
          </Link>
        </div>

        <div className="relative mx-auto aspect-[6/13] w-[min(42%,150px)] md:mx-0 md:w-full">
          <Image
            src="/me/portrait-figure.png"
            alt="Matthew Rizky Hartadi"
            fill
            sizes="(max-width: 768px) 42vw, 200px"
            className="object-contain"
          />
        </div>
      </div>

      <CredentialsStrip className="mt-[clamp(28px,4vw,44px)]" />
    </section>
  );
}
