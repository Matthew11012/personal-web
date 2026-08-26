/** `next/og`'s ImageResponse needs raw font bytes, not next/font's CSS
 * variables — those only resolve in a browser stylesheet context, which
 * satori doesn't have. Google's CSS2 API subsets the font to just the
 * glyphs in `text`, so passing the real copy that will render keeps the
 * fetch small. */
async function loadGoogleFont(family: string, weight: number, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const match = css.match(
    /src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/,
  );
  if (match) {
    const res = await fetch(match[1]);
    if (res.status === 200) return await res.arrayBuffer();
  }
  throw new Error(`failed to load font data for ${family}`);
}

/** Never throws — a Google Fonts outage should degrade the OG image to
 * satori's default font, not 500 the route. */
export async function loadOgFonts(text: string) {
  try {
    const [instrumentSerif, jetbrainsMono] = await Promise.all([
      loadGoogleFont("Instrument Serif", 400, text),
      loadGoogleFont("JetBrains Mono", 400, text),
    ]);

    return [
      {
        name: "Instrument Serif",
        data: instrumentSerif,
        weight: 400 as const,
        style: "normal" as const,
      },
      {
        name: "JetBrains Mono",
        data: jetbrainsMono,
        weight: 400 as const,
        style: "normal" as const,
      },
    ];
  } catch {
    return [];
  }
}
