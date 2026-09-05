import Image from "next/image";
import Link from "next/link";
import { CredentialsStrip } from "@/components/credentials-strip";

/** The compact, demoted stand-in for the scroll-driven route on the
    homepage: no eyebrow of its own (it doesn't peak alongside the
    hero/spine/featured sections above it), body copy toned down to --dim.
    Same content and voice, none of the scroll machinery.

    A plain hairline stands in for the eyebrow it does not have. */
export function IdentityBand() {
  return (
    <section
      aria-label="About Matthew"
      className="mt-[clamp(24px,4vw,56px)] border-t border-hair pt-[clamp(28px,4vw,48px)]"
    >
      <div className="grid grid-cols-1 gap-[clamp(24px,4vw,40px)] md:grid-cols-[minmax(0,1fr)_minmax(0,clamp(110px,13vw,140px))] md:items-start">
        <div className="about-body max-w-[52ch] text-dim">
          <p className="mb-4">
            I&rsquo;m Matthew, a grad student and engineer working on
            retrieval and applied AI, based in Brisbane by way of Jakarta.
          </p>
          <Link
            href="/about"
            className="navlink label-mono inline-flex tracking-[0.18em] text-gardener"
          >
            The long version →
          </Link>
        </div>

        <div className="relative mx-auto aspect-[6/13] w-[min(42%,150px)] md:mx-0 md:h-[clamp(220px,26vw,300px)] md:w-auto">
          <Image
            src="/me/portrait-figure.png"
            alt="Matthew Rizky Hartadi"
            fill
            sizes="(max-width: 768px) 42vw, 140px"
            className="object-contain"
          />
        </div>
      </div>

      <CredentialsStrip className="mt-[clamp(28px,4vw,44px)]" />
    </section>
  );
}
