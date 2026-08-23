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

## Hover/tap interactions

Any "hover a thing to change another thing" component needs **separate** hover,
focus and pin states resolved by precedence (`hovered ?? focused ?? pinned ?? 0`)
— never one shared index. A click is always preceded by the hover and focus that
write that same value, so a toggle comparing against it undoes itself; and a tap
gets synthesised pointer events but no `mouseleave`, so it lands back on the
default. Gate hover to `e.pointerType === "mouse"` on `onPointerEnter/Leave`.
`src/components/intro-band.tsx` is the worked example. (This is the same
touch-support gap the heatmaps still have, solved once.)

## Assets

`sharp` is already in `node_modules` (a Next dependency) — use it directly for
cropping/keying/resizing rather than asking for pre-processed files. Scripts must
`require()` it by absolute path if they run from outside the project dir.
`src/lib/me.ts` holds the gardener's olive accent + CV link; `/about`, the footer
and the intro band all import it.

## Verification commands

- No `typecheck` script in `package.json` — use `npx tsc --noEmit`.
- `npm run lint` (ESLint 9 flat config via `eslint-config-next`).
