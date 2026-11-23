/**
 * A fixed, non-scrolling texture layer: fine paper grain plus a static warm
 * wash, giving the page ambient depth without costing a repaint per scroll
 * frame. `fixed inset-0 pointer-events-none` only - grain on a scrolling
 * container repaints continuously and tanks mobile framerate.
 *
 * z-[60]: above everything, SiteHeader's sticky `z-20` included. Sitting
 * below the header instead looks like a bug - the header has an opaque
 * bg-bg, so it would render as a grain-free band across the top of a
 * grained page. A texture layer has to cover the whole surface or none of
 * it. pointer-events-none keeps it out of the hit-test tree entirely, so
 * painting above interactive content costs nothing.
 *
 * Both opacities are deliberately tiny (grain ~4%, wash ~2.5%) so this
 * cannot push --faint/--dim below their pinned 4.5:1 contrast ratios - a
 * few-percent overlay shifts contrast by hundredths, not tenths. No
 * animation: a moving grain is a perf cost and a nausea risk for no gain
 * a static one doesn't already deliver.
 */
export function AmbientLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full opacity-[0.04]">
        <filter id="ambient-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ambient-grain)" />
      </svg>
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 30% 15%, rgba(184,142,88,1), transparent 60%)",
        }}
      />
    </div>
  );
}
