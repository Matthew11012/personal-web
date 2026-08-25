/**
 * The gardener's own details — shared by the home intro band, the footer and
 * /about so the accent and the CV link can't drift apart across three files.
 */

/** Olive. The colour that means "Matthew", as opposed to a plot or a note. */
export const GARDENER_ACCENT = "#9a8636";

/**
 * The one actionable fact on the site, stated once. A garden that hides this
 * from a visiting recruiter is being coy at its own expense — but it belongs
 * in the strip that already holds the CV, not in the band's own voice.
 */
export const AVAILABILITY = "Graduated 2025 — open to work";

export const CV = {
  href: "/MatthewRizkyHartadi_CV.pdf",
  /* Weight is stated so a reader knows what they're about to download. Update
     it here when the PDF is regenerated. */
  label: "CV — PDF, 91 KB ↓",
} as const;
