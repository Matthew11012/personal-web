import { ImageResponse } from "next/og";
import { getProject } from "@/lib/content";
import { loadOgFonts } from "@/lib/og-fonts";
import { siteOgImage } from "@/app/opengraph-image";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    const fonts = await loadOgFonts(
      "The Garden - Matthew Rizky Hartadi" +
        "Field notes from a growing mind. Code, competition, and everything in the space between.",
    );
    return siteOgImage(fonts);
  }

  const micro = `${project.role} - ${project.period}`.toUpperCase();
  const fonts = await loadOgFonts(project.title + micro);

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
            fontSize: 88,
            color: "#221f1b",
            maxWidth: "980px",
          }}
        >
          {project.title}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#5b564d",
          }}
        >
          {micro}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
