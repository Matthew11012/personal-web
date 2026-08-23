/**
 * The gardener's own details — shared by the home intro band, the footer and
 * /about so the accent and the CV link can't drift apart across three files.
 */

/** Olive. The colour that means "Matthew", as opposed to a plot or a note. */
export const GARDENER_ACCENT = "#9a8636";

export const CV = {
  href: "/MatthewRizkyHartadi_CV.pdf",
  /* Weight is stated so a reader knows what they're about to download. Update
     it here when the PDF is regenerated. */
  label: "CV — PDF, 91 KB ↓",
} as const;
