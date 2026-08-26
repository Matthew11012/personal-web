import { getAllNotes } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

const SITE_TITLE = "The Garden — Matthew Rizky Hartadi";
const SITE_DESCRIPTION =
  "Field notes from a growing mind. Code, competition, and everything in the space between.";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const notes = getAllNotes();

  const items = notes
    .map((note) => {
      const url = `${SITE_URL}/notes/${note.slug}`;
      return `
    <item>
      <title>${escapeXml(note.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(note.plantedIso).toUTCString()}</pubDate>
      <description>${escapeXml(note.excerpt)}</description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
