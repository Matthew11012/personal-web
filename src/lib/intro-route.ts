/**
 * The intro band's geometry, as data.
 *
 * The band draws a life as a route: a single stem out of Jakarta in 2021 that
 * **forks** in 2024 into two strands running at once — one in Brisbane, one
 * still in Jakarta — each ending in its own degree, and rejoining at "now".
 * It was a double degree, not a transfer, and the fork is how the drawing says
 * so without a caption having to.
 *
 * Two grammars share the drawing:
 *
 * - **Chapters** sit *on* a strand. Dated, ordered, geographic. Their `year`
 *   stamp carries the fact so the `phrase` is free to be a sentence rather
 *   than a registrar's entry.
 * - **Threads** hang *off* the route on short spurs. Undated, concurrent,
 *   deliberately unnumbered — 01/02/03 would claim an order they don't have.
 *   The spur geometry is what says "this runs alongside"; no copy has to.
 *
 * Everything here is authored by hand in a 0-100 space and scaled to pixels at
 * render time. The strand points, the chapter `x`/`y`, and the thread spurs are
 * ONE UNIT: move a chapter and the strand that passes it has to move too, or
 * the line runs through a photograph. `at` is separate — it is where along that
 * strand's own arc length (0-1) the thing sits, which is what lets a marker
 * light up when the drawn line actually reaches it rather than when it happens
 * to scroll into view.
 */

/** A cubic segment (or the opening move) in 0-100 space: x,y pairs. */
export type Pt = readonly number[];

export type StrandKey = "spine" | "jakarta";

export type Strand = {
  key: StrandKey;
  points: readonly Pt[];
  /** Stroke width. The Jakarta strand is lighter — same colour, because both
      strands are the same person; a second hue would read as two subjects. */
  weight: number;
  /** Where on the SPINE this strand starts and ends, so its own drawing can be
      remapped onto the spine's progress and the two advance together under one
      scroll source. `null` for the spine itself. */
  span: readonly [number, number] | null;
};

export type Figure = {
  src: string;
  alt: string;
  caption: string;
  /** `placeholder` renders a grey block at `ratio` instead of an <Image>, for
      chapters whose photograph doesn't exist yet. */
  shape: "cutout" | "frame" | "disc" | "placeholder";
  /** Width below the lg breakpoint, where the route straightens into a rail. */
  narrow: string;
  width: string;
  ratio: string;
};

export type Chapter = {
  key: string;
  /** The mono stamp. Carries the date so the phrase doesn't have to. */
  stamp: string;
  phrase: string;
  strand: StrandKey;
  at: number;
  x: number;
  y: number;
  /** `dot` is a waypoint you passed through. `tick` is a terminal — a strand
      ending — and gets a cross-stroke instead, the way a transit map ends a
      line. The two graduations are not places, they're where each strand stops. */
  mark: "dot" | "tick";
  figure?: Figure;
  pad: string;
  lift: string;
  /** Render the figure ABOVE the marker instead of below it, with the stamp
      staying glued to the marker. Used by the UI terminal, whose strand ends
      at the box's left edge with the whole upper-left free. */
  figureAbove?: boolean;
  /** Parallax travel in px for this chapter's figure. */
  drift?: number;
};

export type Thread = {
  key: string;
  /** Cadence, not a number. The three differ on rhythm, not on order. */
  cadence: string;
  phrase: string;
  /** The spur: leaves the route at its first point, ends at the content. */
  spur: readonly Pt[];
  at: number;
  x: number;
  y: number;
  figure?: Figure;
  pad: string;
  lift: string;
  drift?: number;
};

export type IntroRoute = {
  boxH: number;
  strands: readonly Strand[];
  chapters: readonly Chapter[];
  threads: readonly Thread[];
  /** The one phrase that spans both terminals, sitting in the gap between them.
      No marker — it belongs to both strands, so it can't sit on either. */
  terminalNote: { text: string; x: number; y: number; at: number };
  /** Stops for the scrubbing year in the gutter: spine progress → year. */
  yearStops: readonly (readonly [number, number])[];
  /** Chapter and thread keys in chronological order, for the narrow rail.
      Authored rather than derived: a chapter's `at` is a fraction of its own
      strand's arc length, and the spine's and Jakarta's scales aren't
      comparable, so no sort on `at` puts the September terminal after the
      July one. */
  railOrder: readonly string[];
};

/* ------------------------------------------------------------------ */

const PORTRAIT: Figure = {
  src: "/me/portrait-figure.png",
  alt: "Matthew Rizky Hartadi",
  caption: "Brisbane",
  /* The only figure without a frame: a cut-out standing on the page itself.
     It stands at the rejoin, where the two strands become one person again —
     which is both the best placement it could have and the thing that stops
     the converging geometry looking like it simply ran out. */
  shape: "cutout",
  /* 6:13, so a width that suits the landscape photos would make it 650px of
     standing figure on a phone. It gets its own. */
  narrow: "w-[min(42%,150px)]",
  width: "lg:w-[clamp(120px,13vw,160px)]",
  ratio: "aspect-[6/13]",
};

const HACKATHON: Figure = {
  src: "/me/hackathon.jpg",
  alt: "Matthew presenting UQuizzle on stage at UQ",
  caption: "UQuizzle — UQ Hackathon",
  shape: "frame",
  narrow: "w-[min(100%,300px)]",
  /* Capped at 300 so it still clears the box edge on a 1024px viewport,
     where it sits in the right margin beside the spine column. */
  width: "lg:w-[clamp(220px,24vw,300px)]",
  ratio: "aspect-[3/2]",
};

const RIDING: Figure = {
  src: "/me/riding.jpg",
  alt: "Matthew at a lookout with two road bikes, the city below",
  caption: "On the bike — Brisbane",
  /* A disc, not a rectangle. The one curve on a page built from hairlines and
     right angles, and it earns it: the subject is a wheel. */
  shape: "frame",
  narrow: "w-[min(72%,250px)]",
  width: "lg:w-[clamp(170px,19vw,240px)]",
  ratio: "aspect-square",
};

const UI_GRAD: Figure = {
  src: "/me/ui-grad.jpg",
  alt: "Matthew in Universitas Indonesia graduation robes with his parents, the UI rectorate building behind them",
  caption: "With my parents — Depok",
  shape: "frame",
  narrow: "w-[min(78%,240px)]",
  /* Narrower than the landscape figures: it is 3:4, so matching their width
     would make it the tallest block on the route by half again. */
  width: "lg:w-[clamp(170px,18vw,220px)]",
  ratio: "aspect-[3/4]",
};

const UQ_GRAD: Figure = {
  src: "/me/uq-grad.jpg",
  alt: "Matthew and three friends in academic gowns under the sandstone cloisters of UQ's Great Court",
  caption: "The Great Court — UQ, Brisbane",
  shape: "frame",
  narrow: "w-[min(100%,300px)]",
  width: "lg:w-[clamp(220px,26vw,350px)]",
  ratio: "aspect-[16/9]",
};

/** Grey blocks for the /about variant, until the real photographs exist. */
function placeholder(caption: string, ratio: string): Figure {
  return {
    src: "",
    alt: "",
    caption,
    shape: "placeholder",
    narrow: "w-[min(100%,300px)]",
    width: "lg:w-[clamp(200px,24vw,300px)]",
    ratio,
  };
}

/* ------------------------------------------------------------------
   The route itself.

   After the fork the two strands run as two COLUMNS — the spine swings right
   and drops nearly straight to the UQ terminal, the Jakarta strand drops left
   to the UI terminal. That shape is what makes the fork period inhabitable:
   the earlier draft curved the spine across the middle, which left two
   channels too narrow for a photograph and forced every thread below the
   rejoin. With the columns parallel, the whole right margin is free, so the
   hackathon thread hangs there — inside the double-degree years, which is
   when it actually happened.

   Anchors (home, y as % of boxH):
     2021 UI, Jakarta   (60,  1)   dot, text-only — no photograph yet
     2024 the fork      (24, 13)   dot
     hackathons         (64, 24)   thread, off the spine's right side
     UQ terminal        (60, 40)   tick — Jul 2025
     UI terminal        ( 5, 43)   tick — Sep 2025
     the shared phrase  (26, 45)   no marker, sits in the gap
     now / rejoin       (46, 54)   dot, the portrait stands here
     tail               ( 0,100)   runs out at "The long version →"
   ------------------------------------------------------------------ */

const SPINE_POINTS: readonly Pt[] = [
  [60, 1],
  [48, 5, 40, 9, 24, 13],
  /* Out of the fork the spine continues down-LEFT and only turns right once it
     is clear of the fork chapter's heading, which hangs below-and-right of the
     marker like every block here. Turning sooner needs a doubling-back dip,
     and that reads as a kink in the line rather than a route. */
  [20, 16, 16, 19, 18, 23],
  [26, 26, 44, 25, 58, 27],
  /* Then a near-vertical column down to the terminal, which is what keeps the
     right margin clear for the hackathon thread. */
  [60, 31, 60, 36, 60, 40],
  [58, 45, 52, 50, 46, 54],
  /* The tail runs to the box's bottom-left corner, which is exactly where the
     "long version" link sits — so the route ends somewhere rather than
     trailing off the bottom of the page. It is also the only strand below the
     rejoin, which is what leaves room for the two remaining threads. */
  [30, 64, 12, 80, 6, 90],
  [4, 94, 2, 97, 0, 100],
];

const JAKARTA_POINTS: readonly Pt[] = [
  [24, 13],
  /* Pushed left hard and early so the two strands separate cleanly instead of
     running near-parallel — or crossing — just under the fork. */
  [10, 16, 5, 26, 5, 43],
  [8, 47, 28, 51, 46, 54],
];

/** Spine progress at the fork and at the rejoin — the Jakarta strand's span. */
const FORK_AT = 0.15;
const REJOIN_AT = 0.59;

const STRANDS: readonly Strand[] = [
  { key: "spine", points: SPINE_POINTS, weight: 1.5, span: null },
  { key: "jakarta", points: JAKARTA_POINTS, weight: 1, span: [FORK_AT, REJOIN_AT] },
];

const YEAR_STOPS: readonly (readonly [number, number])[] = [
  [0, 2021],
  [FORK_AT, 2024],
  [0.47, 2025],
  [REJOIN_AT, 2025],
  [1, 2026],
];

/**
 * All three hang off the tail, in the lower zone. Spur origins are points ON
 * the tail, solved off its cubic rather than guessed — a spur that starts a few
 * percent off the line reads as a floating tick rather than a branch.
 *
 * The spurs are long, and deliberately so: the tail sweeps to the bottom-left
 * corner, so anything hung to its right reaches across open space to get there.
 * They stay at weight 1 against the spine's 1.5 so a branch never competes with
 * the route it left.
 */
const THREADS: readonly Thread[] = [
  {
    key: "hackathons",
    cadence: "a few weekends a year",
    phrase: "The hackathons I lose them to",
    /* Inside the double-degree years, hung off the right of the spine column:
       this happened DURING the fork, and sitting there says so. */
    spur: [
      [47.7, 26],
      [53, 25.3, 58, 24.6, 64, 24],
    ],
    at: 0.33,
    x: 64,
    y: 24,
    figure: HACKATHON,
    pad: "pl-7",
    lift: "-translate-y-[0.5em]",
    drift: 12,
  },
  {
    key: "triathlon",
    cadence: "most mornings",
    phrase: "The triathlon that took over from ten years of taekwondo",
    spur: [
      [17.9, 76],
      [20, 76, 23, 76, 26, 76],
    ],
    at: 0.79,
    x: 26,
    y: 76,
    figure: RIDING,
    pad: "pl-9",
    lift: "-translate-y-[0.9em]",
    drift: 14,
  },
  {
    /* The one thread with no clean start date and no photograph — so it hangs
       last, where the line runs out. The asymmetry is honest: this is the
       branch that hasn't finished. */
    key: "work",
    cadence: "most days",
    phrase: "The retrieval systems I build",
    spur: [
      [3.8, 94],
      [6, 94, 10, 94, 14, 94],
    ],
    at: 0.95,
    x: 14,
    y: 94,
    pad: "pl-8",
    lift: "-translate-y-[1.1em]",
  },
];

function chapters(withFigures: boolean): readonly Chapter[] {
  return [
    {
      key: "start",
      stamp: "2021 — Universitas Indonesia",
      phrase: "Four years of computer science, in Jakarta",
      strand: "spine",
      at: 0,
      x: 60,
      y: 1,
      mark: "dot",
      figure: withFigures
        ? placeholder("Universitas Indonesia — Depok", "aspect-[3/2]")
        : undefined,
      pad: "pl-8",
      lift: "-translate-y-[1.1em]",
      drift: 10,
    },
    {
      key: "fork",
      stamp: "2024 — the double degree",
      phrase: "The year the road split in two",
      strand: "spine",
      at: FORK_AT,
      x: 24,
      y: 13,
      mark: "dot",
      pad: "pl-8",
      /* No upward lift on this one: the spine is still descending from the
         right just above the fork marker, and a lifted heading rises into it. */
      lift: "translate-y-[0.2em]",
    },
    {
      key: "uq",
      stamp: "Jul 2025 — UQ, Data Science",
      phrase: "",
      strand: "spine",
      at: 0.47,
      x: 60,
      y: 40,
      mark: "tick",
      figure: UQ_GRAD,
      pad: "pl-7",
      lift: "-translate-y-[0.4em]",
      drift: 10,
    },
    {
      key: "ui",
      stamp: "Sep 2025 — UI, Computer Science",
      phrase: "",
      strand: "jakarta",
      /* On the JAKARTA strand's own arc length, not the spine's. */
      at: 0.62,
      x: 5,
      y: 43,
      mark: "tick",
      figure: UI_GRAD,
      figureAbove: true,
      pad: "pl-7",
      lift: "-translate-y-[0.4em]",
      drift: 10,
    },
    {
      key: "now",
      stamp: "Now — Brisbane",
      phrase: "Back to one road, working out where it goes",
      strand: "spine",
      at: REJOIN_AT,
      x: 46,
      y: 54,
      mark: "dot",
      figure: PORTRAIT,
      pad: "pl-8",
      lift: "-translate-y-[1.1em]",
      drift: 12,
    },
  ];
}

/* The rail's chronology. The hackathon thread happened DURING the fork years,
   so it belongs between the fork and the UQ terminal — which is where the wide
   route puts it, and where listing all chapters before all threads did not. */
const RAIL_ORDER: readonly string[] = [
  "start",
  "fork",
  "hackathons",
  "uq",
  "ui",
  "now",
  "triathlon",
  "work",
];

export const INTRO_ROUTES = {
  home: {
    boxH: 2900,
    strands: STRANDS,
    chapters: chapters(false),
    threads: THREADS,
    terminalNote: {
      text: "Two degrees, eight weeks apart",
      x: 26,
      y: 45,
      at: 0.53,
    },
    yearStops: YEAR_STOPS,
    railOrder: RAIL_ORDER,
  },
  about: {
    boxH: 3400,
    strands: STRANDS,
    chapters: chapters(true),
    threads: THREADS,
    terminalNote: {
      text: "Two degrees, eight weeks apart",
      x: 26,
      y: 45,
      at: 0.53,
    },
    yearStops: YEAR_STOPS,
    railOrder: RAIL_ORDER,
  },
} satisfies Record<string, IntroRoute>;

export type IntroVariant = keyof typeof INTRO_ROUTES;

/**
 * Scale a hand-authored 0-100 point list into an SVG path in pixels.
 *
 * The obvious alternative — a 0-100 viewBox with `preserveAspectRatio="none"`
 * — cannot work. Stretching it needs `vector-effect: non-scaling-stroke` to
 * keep the stroke an even width, and Chrome then reads stroke-dasharray in
 * screen pixels, which silently defeats the `pathLength="1"` normalisation
 * Motion uses to draw the line: the whole route renders as a fixed dotted
 * pattern instead of one advancing stroke, at every scroll position. Scaling
 * the coordinates ourselves keeps the stroke honest and the drawing intact.
 */
export function buildPath(points: readonly Pt[], w: number, h: number): string {
  return points
    .map((seg, i) => {
      const pairs: string[] = [];
      for (let j = 0; j < seg.length; j += 2) {
        pairs.push(
          `${((seg[j] * w) / 100).toFixed(1)} ${((seg[j + 1] * h) / 100).toFixed(1)}`,
        );
      }
      return `${i === 0 ? "M" : "C"} ${pairs.join(", ")}`;
    })
    .join(" ");
}
