import type { MetadataRoute } from "next";
import { getAllNotes, getAllProjects } from "@/lib/content";
import { PLOTS } from "@/lib/plots";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["/", "/about", "/notes", "/work", "/plots"].map(
    (path) => ({
      url: `${SITE_URL}${path}`,
    }),
  );

  const plotRoutes = PLOTS.map((plot) => ({
    url: `${SITE_URL}/plots/${plot.slug}`,
  }));

  const noteRoutes = getAllNotes().map((note) => ({
    url: `${SITE_URL}/notes/${note.slug}`,
    lastModified: new Date(note.plantedIso),
  }));

  const projectRoutes = getAllProjects().map((project) => ({
    url: `${SITE_URL}/work/${project.slug}`,
  }));

  return [...staticRoutes, ...plotRoutes, ...noteRoutes, ...projectRoutes];
}
