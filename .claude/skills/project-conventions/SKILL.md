---
name: project-conventions
description: This project's coding conventions, patterns, and standards. Use whenever writing or reviewing code in this repo so output stays consistent with the existing codebase.
---

# personal_web conventions

Next.js 16.2.11 (App Router), TypeScript, Tailwind v4, zod, `postgres` (Supabase transaction-mode pooler), `motion/react`. Deployed on Vercel with SSR+ISR (no static export).

## The "server-only lib + async server component band" pattern

For any external API integration (Strava, GitHub, ...), the shape is always:
- `src/lib/<service>.ts` — server-only. `// Server-side only` header comment, a `requireEnv(name)` helper, one hard `AbortSignal.timeout(...)`-bounded `fetch`, `cache: "no-store"`, zod-validated response. **Never catches its own errors** — every failure path throws; the caller owns degrade-on-failure.
- `src/components/<area>/<service>-activity-band.tsx` — async server component. `try { await fetch-fn() } catch { console.error(...); return null }`. Renders nothing (not an error UI) on any failure or empty result. Composed from `MetaStrip` (header) + `ResultFigures` (`countUp` for a scroll-triggered headline figure) + a chart component.
- Invoked as plain JSX from a **synchronous** parent page (`<GithubActivityBand />` / `<HomeTrainingBand />`) — Next resolves the nested async Server Component without the parent needing `async`/`await`. Don't make the page async just to host one async band.
- Page needs `export const revalidate = 86400;` if it hosts a band doing a live fetch.

See `src/lib/strava.ts` + `src/components/training/home-training-band.tsx` as the original, `src/lib/github.ts` + `src/components/engineering/github-activity-band.tsx` as the second instance.

## Chart/heatmap components

- CSS Grid, never SVG — `grid-auto-flow` + a `sm:` breakpoint template swap does the desktop (weeks-as-columns) ↔ mobile (weeks-as-rows) transpose for free.
- Cap cell size (`MAX_CELL_PX`, currently 40) on the desktop axis — an uncapped `1fr` track makes *short* ranges balloon into huge cells.
- All chart colors go through a `--acc` CSS custom property (`color-mix(in srgb, var(--acc) X%, transparent)`), set inline by the wrapping band component (`style={{ ["--acc" as string]: accent }}`) — never a hardcoded hex in the chart itself. This is what makes charts recolor for free under the `.dark` class (next-themes).
- Hover/active state drives the shared `src/components/training/chart-inspector.tsx` (`ChartInspector`) readout below the grid, not a floating tooltip — it's already generic (`eyebrow`/`figures`/`rows`/`active` props), reuse it directly rather than building a new readout.
- **Known gap, present in every heatmap so far**: cells only wire `onMouseEnter` + keyboard arrow-nav for the inspector — no touch/click handler, so the per-day readout is desktop-only. Worth fixing once, shared, rather than per-component, if it's ever prioritized.
- Keyboard contract: single tab-stop `role="group"` (not per-cell tabbing), arrow keys = ±1 week (left/right) / ±1 day (up/down), Home/End, Escape to clear.

## Scroll-linked motion

`Providers` wraps everything in `LazyMotion ... strict`, so only `m.*` is legal.
`MotionConfig reducedMotion="user"` covers `animate`/`whileInView` but **not**
`useScroll`/`useTransform`/`useSpring` — scroll-linked values keep updating, so
gate them yourself with `useReducedMotion()` and pin the end state.
`src/components/intro-band.tsx` is the worked example (SVG `pathLength` drawn by
scroll). All of its geometry lives in `src/lib/intro-route.ts` as typed data
(`INTRO_ROUTES.home` / `.about`, selected by the band's `variant` prop) —
strands, chapter/thread `x`/`y`, spur control points and `boxH` are ONE UNIT
authored in a 0-100 space. Move one and the strand passing it has to move too.

Two things about that file that cost real time:

- **`at` is not comparable across strands.** A chapter's `at` is a fraction of
  *its own strand's* arc length, so the Jakarta strand's values can't be sorted
  against the spine's. The narrow rail therefore renders in **declared array
  order** (already chronological), never `.sort((a,b) => a.at - b.at)`.
- **Track the route box, not the `<section>`.** `useScroll` on the section makes
  the lede eat ~19% of the range before the line starts drawing, so the year
  scrubber reads 2023 while the reader is looking at the 2021 chapter. Target
  the grid wrapper with `offset: ["start start", "end 0.7"]`.

**`vector-effect: non-scaling-stroke` silently breaks `pathLength` drawing.**
Motion animates `pathLength` via `stroke-dasharray` in path-length units
(`pathLength="1"`), but Chrome reads the dash array in *screen* pixels when
non-scaling-stroke is set — so the line renders as a fixed dotted pattern along
its whole length instead of one advancing stroke, at every scroll position. The
two cannot be combined. If a stretched `viewBox` + `preserveAspectRatio="none"`
is what made non-scaling-stroke necessary, scale the coordinates into pixels in
JS instead and use a 1:1 `viewBox` (`buildPath` in `src/lib/intro-route.ts`).

**Two transforms on one element: the second one wins silently.** Motion writes
`transform` inline, so a `translate`/`scale` Tailwind class on the same element
is dropped, and so is a `y` from `whileInView` when `style.y` is also set. The
band nests them instead: an outer `m.div` carries the parallax `style={{ y }}`,
an inner one carries the rise-in `whileInView`, and the static `pad`/`lift`
classes sit on a plain wrapper above both.

**Verify route geometry by measuring, not by looking.** Screenshots hide
near-misses and eyeballing costs several rounds. In the page, walk each path
with `getPointAtLength` and test against content rects — but measure text with
`Range.getClientRects()`, not `getBoundingClientRect()` on the element: the
eyebrow `<span>` is `display:block`, so its element rect spans the whole column
and both over- and under-reports collisions. Check block-vs-block overlap after
*every* coordinate move, not just at the end.

Prefer driving scroll-reactive decoration off the same MotionValue as the thing
it decorates (`useTransform(drawn, [at, at + 0.06], [0, 1])`) rather than off
`whileInView` — but never gate *content* behind a scroll value, only ornament.

## Assets

`sharp` is already in `node_modules` (a Next dependency) — use it directly for
cropping/keying/resizing rather than asking for pre-processed files. Scripts must
`require()` it by absolute path if they run from outside the project dir.
`src/lib/me.ts` holds the gardener's olive accent + CV link; `/about`, the footer
and the intro band all import it.

## Verification commands

- No `typecheck` script in `package.json` — use `npx tsc --noEmit`.
- `npm run lint` (ESLint 9 flat config via `eslint-config-next`).

## The intro band's narrow rail (below `lg`)

The rail is a `border-l` on the `<ul>` plus `pl-7`, so a row's own left edge is
29px from the line. Never eyeball a marker's offset: everything anchors to
`RAIL_X` (`spine` / `branch`) + `-translate-x-1/2` in `intro-band.tsx`. Tailwind
v4 emits `translate:` for those utilities, so `getComputedStyle(el).transform`
reads `none` even when the shift is applied — measure with
`getBoundingClientRect()`, not the computed transform.

The rail is scroll-scrubbed off its OWN `useScroll` target (the desktop route
box is `hidden lg:grid`, so its progress is meaningless below `lg`), with
`offset: ["start 0.5", "end 0.5"]` — both ends on the viewport middle, so
progress IS the fraction of the rail above the middle line and a mark's
measured y-fraction compares to it with no correction. Row positions are
measured from the DOM in a `ResizeObserver` pass (rows are as tall as their
photographs); until that lands, every `at` defaults to 2 so nothing lights.
One-shot effects (the marker pulse) key off a crossing counter, never off the
scroll value — a scrubbed pulse finishes inside one frame when the reader
flicks. Give the crossing test a hysteresis band; the rail's spring overshoots
and will otherwise ring the same mark repeatedly.

Rail order is authored data (`railOrder` in `intro-route.ts`), not derived: a
chapter's `at` is a fraction of its *own* strand's arc length, and the spine's
and Jakarta's scales aren't comparable, so no sort on `at` is correct.

## Formatting

Prettier is NOT a project dependency and there is no config — do not run
`npx prettier --write`. It rewrites line endings and reflows untouched code,
burying the real diff.

## Mono labels

`.label-mono` (globals.css) is 11px uppercase, 10px below 640px. It sets NO
letter-spacing: tracking is applied per call site with `tracking-[…]` (0.08em
to 0.26em across ~70 usages) and is what separates an eyebrow from a nav link.
The class is unlayered, so adding `letter-spacing` to it would silently
override every one of those call sites — the Tailwind v4 layer trap. Don't.

A `flex flex-wrap justify-between` strip is the wrong shape on a phone: once it
wraps, each item takes a full row and the slack collects mid-row. Use a grid
below `sm` and switch to the flex row at `sm:`.

## Information architecture (post P0 restructure, 2026-08-25)

- `/notes` is the canonical notes index, grouped by plot. `/plots` **permanently
  redirects** to it; `/plots/[plot]` survives as per-plot views. The nav label stays
  "The plots" pointing at `/notes` — deliberate, don't "fix" the mismatch.
- `IntroBand` has exactly one call site: `/about`. It renders the **`home`** variant,
  because `INTRO_ROUTES.about` still uses grey placeholder blocks (`intro-route.ts:180`)
  where photographs don't exist yet. When real photos land, switch `/about` back to
  `variant="about"` — that's the only reason the second variant still exists.
- Two index-row components, `NoteIndexRow` and `ProjectIndexRow`, share a row geometry
  (lead / title / dotted leader / trailing text) and the `idx*` hover variants. They are
  deliberate copies, not an abstraction — the third copy, `PlotIndexRow`, was deleted when
  its consumers went away.
- `featured: boolean` on both collections drives homepage note ordering and the workshop
  teaser. Ordering lives in `getRecentNotes` **only** — `getAllNotes`'s sort feeds
  `getNotesByPlot` and the positional `01..NN` numbering on `/plots/[plot]`, so touching it
  silently renumbers every plot page.

## Traps that cost real time

- **content-collections transforms return explicit object literals with no spread.** A new
  schema field needs adding in *three* places: the zod schema, the transform's return
  object, and the interface in `src/lib/types.ts`. Miss the transform and the field is
  silently absent at runtime; miss the interface and it's a type error.
- **`idxRowVariants` is hover-only (`rest`/`hover`).** Components using it set
  `initial="rest"`, which overrides variant inheritance — so the `StaggerGroup` wrapping
  `ProjectIndexRow` on `/work` is a **silent no-op**. For a row that must both enter and
  hover, merge `hidden`/`show`/`hover` into one variant object; `entryCardVariants` and
  `noteRowVariants` are the working examples.
- **Removing a `/work/<slug>` route does not fail the build.** `buildSlugIndex` registers
  project slugs whether or not a route exists, so `[[some-project]]` keeps compiling and
  `hrefFor` keeps rewriting it to a URL that now 404s. `content.ts` hardcodes the same path
  independently for backlinks. The failure is silent dead links.
- **Tailwind v4 + Turbopack dev does not always regenerate newly-introduced utility
  strings.** Brand-new `sm:` / `supports-[...]` variants can come back `display: none` with
  the class present in the DOM. `rm -rf .next` and restart `next dev`; a hard reload is not
  enough. Confirm with a computed-style check, never from the markup.
- **Don't run two implementer subagents that both `npm run build` in one worktree** — they
  collide on `.next` and each reads the other's half-finished tree as a failure. Give
  parallel agents `npx tsc --noEmit` + scoped `eslint`, and run the build yourself after.

## Verifying UI changes

- **Full-page screenshots freeze scroll-driven and lazy content at scroll 0.** The intro
  band photographs, `whileInView` reveals and `CountUpFigure` all render empty or `0` in a
  `fullPage` capture. Scroll, then take viewport captures, or you will report bugs that
  don't exist.
- Contrast and hit targets must be measured with `getComputedStyle` /
  `getBoundingClientRect` in a real browser. Tailwind v4 cascade layers mean the classes
  can read correctly while the computed value is wrong.
- Check 1440x900 and 390x844 in **both** themes. `next-themes` persists the choice, so
  reset it explicitly rather than assuming which theme you're in.

## Accessibility invariants (P1, 2026-08-26)

- **`--faint` / `--dim` are text-only tokens** and both are pinned by WCAG 4.5:1,
  not by taste. Light: `--faint #6a6459` (4.54 bg / 5.12 panel), `--dim #5b564d`.
  Dark: `--faint #948b78` (5.38 bg / **4.95 panel** — `--panel` is the binding
  surface in dark mode, `--bg` is not). Lightening either one re-breaks SC 1.4.3
  across ~64 call sites. Borders use `--hair` / `--rule`; never repurpose these two.
- **`.navlink::after` reads `bottom: var(--navlink-bottom, -5px)`.** The rule is
  unlayered, so an `[&::after]:bottom-*` utility on the element is silently
  ignored — the Tailwind v4 trap, confirmed by measurement. Any `.navlink` that
  gains vertical padding must set `[--navlink-bottom:<pad − 5px>]`. The header's
  nav links carry `py-2`, hence `3px`.
- **Header hit targets are `py-2 -my-2`** (`-mx-2 px-2` too on the theme toggle,
  whose label is `display:none` below `sm`, leaving a bare 10px pip). The header
  container is `gap-x-3 gap-y-5`: below ~400px the logo wraps to its own row, and
  16px of slop across two rows overlaps inside a 12px gap. Measured 26×26 minimum,
  zero overlaps at 390.
- **Heading contract**: section labels are `h2`, index/card titles `h3`.
  `EntryRow` is `/plots/[plot]`'s only consumer and that route has no section
  label, so its titles are `h2` directly. `MetaStrip` is deliberately NOT a
  heading — a section label must not be routed through it (`/work`'s "Also built"
  carries its own `h2` with the same classes for this reason).
  `createMdxComponents` maps **both** `h2` and `h3` to one renderer: content uses
  `###` today, but an unmapped `##` emits a bare unstyled `h2`.
- Preflight resets `margin:0` on `*` and `font-size/weight: inherit` on `h1–h6`,
  so a `span→h2` swap is pixel-neutral *provided* the element sits in a flex or
  grid parent (blockified either way). Verified, don't re-derive.

## SEO/publishing plumbing (P2, 2026-08-26)

- **No `SITE_URL`/`metadataBase` existed before this pass.** `src/lib/site.ts` now owns it
  (`NEXT_PUBLIC_SITE_URL` env var, placeholder domain fallback) and `layout.tsx`'s
  `metadataBase` derives from it — anything needing an absolute URL (sitemap, robots, feed,
  OG images) imports from there, don't re-derive.
- **`next/og`'s `ImageResponse` can't use `next/font` or CSS variables** — it needs raw font
  ArrayBuffers. `src/lib/og-fonts.ts` fetches Instrument Serif + JetBrains Mono from the
  Google Fonts CSS2 API, scoped to the actual text being rendered (keeps the fetch small).
  It must never throw — wrap in try/catch and return `[]` on failure, so a Fonts API outage
  degrades to satori's default font instead of 500ing the OG route. Both `opengraph-image.tsx`
  files share this one helper; don't duplicate the fetch logic.
- `generateMetadata` on `notes/[slug]/page.tsx` and `work/[slug]/page.tsx` intentionally only
  set `title`/`description` — no `openGraph`/`alternates` fields on either. Match that when
  extending, don't "complete" one without the other.
- Route-handler segment convention: `next/og` image files (`opengraph-image.tsx`) at a
  dynamic route fall back gracefully by importing and calling the parent/site-level image's
  render function directly (not by redirecting) when the slug doesn't resolve.

## P3 craft/composition (2026-08-26) — design-review doc goes stale fast

- **Always verify a design-review finding against current code before implementing it.**
  Two of six §10-15 items (§11 card alignment, §13 `ch`-measure) were already fixed by
  commits that landed *after* the review's base commit but *before* this branch — the doc
  never got updated. Caught by direct `Read`/`git show`, not by trusting a scout summary
  that paraphrased current code. Cost: near-zero (one extra read pass) vs. a wasted
  implementer round re-fixing something already fixed.
- **`.navlink`'s hover-only underline (`::after`, `bottom:-5px`) and Tailwind's static
  `underline underline-offset-4` don't compose** — combining them on one link produces a
  visible double-line on hover (two different vertical offsets, both visible). If a link
  needs a persistent underline, drop `navlink` entirely rather than stacking it.
- **A `Link`/`a` with no explicit color class falls through to the base `a { color:
  #b0573f }` rule in `globals.css`** (the sitewide default link color) — not to `text-faint`,
  not to a parent's `--acc`. Any link meant to carry a plot's accent needs its own
  `style={{ color: accent }}`, matching the convention already used by the "More from"
  link on note pages.
- **Block-level `<span>`/`<div>` text can visually overflow its own box with no layout
  signal in `getBoundingClientRect()`** — a block element's rect reports its box width
  (which fills the parent), not the rendered text's actual extent, so "does this overflow"
  math from computed styles alone can be wrong. A screenshot after `scrollIntoView` settled
  a case where font-size math predicted overflow that didn't actually occur.

## P4 animation timing (2026-08-26)

- **The count-up on training figures (`count-up-figure.tsx`, `COUNT_EASE`) is intentionally
  kept** — design-review §16 recommended cutting it, but the user explicitly wants the
  current front-loaded easing (reaches near-final value fast, then settles). Don't remove
  it in a future pass without re-confirming with the user first.
- **A `motion` `transition={{ duration, ease }}` value is a plain JS object passed straight
  to the animation library** — not a Tailwind CSS class, so the "prerendered HTML lies,
  verify computed style in a browser" trap that applies elsewhere in this repo does NOT
  apply here. Typecheck/lint plus reading the literal back is sufficient signal for a pure
  duration/easing constant change.

## P5 motion polish (2026-08-26)

- **`whileTap` beats CSS `:active` on any element motion already controls.** Same
  "second transform wins silently" trap as hover (P4/scroll-linked-motion section)
  applies to press states too: `entry-card.tsx`/`entry-row.tsx`/`note-index-row.tsx`/
  `project-index-row.tsx`'s outer `MotionLink` carries `whileHover`, so a CSS
  `:active{transform:scale()}` on the same element would silently lose to motion's
  inline style. Added a `tap` variant (sibling to `hover`) in `motion.ts` instead and
  wired `whileTap="tap"`. Plain, non-motion-controlled elements (`.navlink`,
  `theme-toggle.tsx`'s outer `<button>` — only its child pip is motion-driven) got real
  CSS `:active` rules; the file's existing blanket `prefers-reduced-motion` block
  already covers new CSS transitions, no per-rule media query needed.
- **Hover-in duration ≠ entrance duration on the same variants object.** `entryCardVariants`
  and `noteRowVariants` each carry both a `show` (entrance, 0.7s/0.5s) and a `hover` key —
  tightening "hover timing" means touching only `hover`, `show` is a different animation
  that happens to live in the same object. Don't pattern-match on the variable name alone.
- Hover-in tightened 0.4–0.6s → 0.25s (`entryCardVariants`, `entryRuleVariants`,
  `entryPipVariants`, `idxRowVariants`, `idxArrowVariants.hover.x` only — not `.opacity`,
  `noteRowVariants`, `engRowVariants`, `engRuleVariants`). Color-only hovers (all the
  `*TitleVariants`/`*NumVariants`, 0.35s) and `togglePipVariants` were left alone —
  color transitions and the theme toggle weren't part of this pass.
- **`AnimatePresence` in `layout.tsx` alone races the App Router.** `layout.tsx` doesn't
  remount on navigation, so `usePathname()` read there updates one render *after* the new
  route's `children` have already landed — for one commit the old `key` shows new content
  with no animation, THEN the key changes and exit/enter fires on content that's already
  swapped. Symptom: a visible flash-in → fade-to-blank → fade-in-again on every nav.
  Fix: put the pathname-keyed `m.div` in `app/template.tsx` instead, which Next.js *does*
  remount fresh per navigation — `usePathname()` and `children` then arrive atomically.
  Keep `AnimatePresence` itself in the persistent layout (a plain wrapper, no key logic)
  so it can see the template instance change. Verified by sampling `main`'s children's
  computed `opacity`/`filter` via `requestAnimationFrame` across a real click — screenshots
  are too coarse to catch a ~250ms race, don't trust one for this class of bug.
- **Even fixed, the `exit` animation on that `m.div` never plays** — the App Router swaps
  the outgoing page before `AnimatePresence` gets a two-phase removal to intercept, so an
  old page just holds at rest until the new one is ready. Don't add an `exit` prop back
  without re-verifying it actually fires; it silently does nothing today. Only `initial`→
  `animate` (the enter fade+lift) is real.

## Verifying in a browser (additions)

- **Chrome on Windows won't size a window below ~501px.** `resize_page` to 390
  silently gives you 501, which is still under `sm` so mobile styles look right
  while wrap behaviour does not. Use `emulate` with `viewport: "390x844x3,mobile,touch"`.
- **`html`/`body` carry `transition: background 0.5s`.** Measuring contrast right
  after toggling `.dark` samples a mid-transition colour — you get a background
  that matches no token (e.g. `#312c26`) and invented failures. Wait ≥1200ms, and
  assert `getComputedStyle(document.body).backgroundColor` is the real token first.
- A dev server whose `.next` was deleted underneath it 500s on every route and
  does not recover. Don't `rm -rf .next` while one is running — start a second on
  another port instead.
