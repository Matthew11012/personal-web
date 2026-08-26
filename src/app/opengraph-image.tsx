import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "The Garden — Matthew Rizky Hartadi";
const TAGLINE =
  "Field notes from a growing mind. Code, competition, and everything in the space between.";

/** Shared site-level OG layout, reused as the fallback for per-note images
 * (unit 7) when a slug doesn't resolve to a note. */
export function siteOgImage(fonts?: Awaited<ReturnType<typeof loadOgFonts>>) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#e8e2d5",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Instrument Serif",
            fontSize: 96,
            color: "#221f1b",
            maxWidth: "980px",
          }}
        >
          {TITLE}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#5b564d",
            maxWidth: "980px",
          }}
        >
          {TAGLINE}
        </div>
      </div>
    ),
    { ...size, ...(fonts ? { fonts } : {}) },
  );
}

export default async function Image() {
  const fonts = await loadOgFonts(TITLE + TAGLINE);
  return siteOgImage(fonts);
}
