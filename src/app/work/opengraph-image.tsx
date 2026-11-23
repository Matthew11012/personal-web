import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "The Workshop";
const DESCRIPTION =
  "Projects explained, not hosted. What got built, and what it took.";

export default async function Image() {
  const fonts = await loadOgFonts(TITLE + DESCRIPTION);

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
            fontFamily: "Libre Caslon Display",
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
          {DESCRIPTION}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
