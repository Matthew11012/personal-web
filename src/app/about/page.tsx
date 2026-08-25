import Link from "next/link";
import { IntroBand } from "@/components/intro-band";
import { Reveal } from "@/components/reveal";
import { GARDENER_ACCENT as ACCENT } from "@/lib/me";

export default function AboutPage() {
  return (
    <div className="px-[clamp(24px,6vw,120px)] pb-[clamp(70px,9vw,120px)] pt-[clamp(36px,5vw,64px)]">
      <Link
        href="/"
        className="navlink label-mono inline-flex gap-2 tracking-[0.18em] text-faint"
      >
        ← The garden
      </Link>

      <div className="border-b border-hair py-[clamp(36px,5vw,52px)] pb-[clamp(32px,4vw,40px)]">
        <Reveal>
          <div
            className="label-mono mb-[22px] tracking-[0.28em]"
            style={{ color: ACCENT }}
          >
            The gardener
          </div>
        </Reveal>
        <Reveal as="wipein">
          <h1 className="display-about max-w-[20ch] text-ink">
            I build systems, chase finish lines, and write down what the two
            have in common.
          </h1>
        </Reveal>
      </div>

      <div className="mt-[clamp(36px,5vw,52px)] grid grid-cols-1 gap-[clamp(32px,5vw,72px)] md:grid-cols-[minmax(0,1fr)_minmax(0,clamp(240px,26vw,340px))]">
        <div className="about-body max-w-[62ch] text-ink">
          <p className="mb-6">
            I&rsquo;m Matthew — a grad student and engineer working on
            retrieval and applied AI, splitting life between Jakarta and
            Brisbane. Most of what I know I learned twice: once in a lab,
            once somewhere with a heart-rate monitor on.
          </p>
          <p className="mb-6">
            This site is a garden, not a blog. Notes go up while they&rsquo;re
            still wrong. Some stay seedlings forever; a few grow evergreen.
            I&rsquo;d rather show the tending than perform the polish.
          </p>
          <p>
            If any of it is useful, or plainly mistaken, tell me — that&rsquo;s
            the whole point of gardening in public.
          </p>
        </div>

        <div>
          <div className="label-mono mb-3.5 tracking-[0.16em] text-faint">
            Now
          </div>
          <div className="mb-[30px] font-body text-[15px] leading-[1.6] text-dim">
            Training for an Olympic-distance triathlon. Reading about
            retrieval budgets. Teaching Saturday taekwondo.
          </div>
          <div className="label-mono mb-3.5 tracking-[0.16em] text-faint">
            Find me
          </div>
          <div className="flex flex-col gap-2 font-mono text-[13px]">
            <a href="https://github.com/Matthew11012" style={{ color: ACCENT }}>
              GitHub ↗
            </a>
            <a href="#" style={{ color: ACCENT }}>
              Are.na ↗
            </a>
            <a href="#" style={{ color: ACCENT }}>
              Email ↗
            </a>
          </div>
        </div>
      </div>

      <Reveal>
        <IntroBand variant="about" />
      </Reveal>
    </div>
  );
}
