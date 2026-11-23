/** The site's four destinations, and how a pathname maps onto one.
 *
 * Shared by the header (which renders them as links) and the side rail (which
 * renders only the name of the one you are on). Kept here rather than exported
 * from the header so the rail doesn't have to import a client component to
 * read a constant.
 */
export const NAV = [
  { href: "/", label: "The garden", short: "Garden", match: (p: string) => p === "/" },
  {
    href: "/notes",
    label: "The plots",
    short: "Plots",
    match: (p: string) => p.startsWith("/notes") || p.startsWith("/plots"),
  },
  {
    href: "/work",
    label: "The workshop",
    short: "Workshop",
    match: (p: string) => p.startsWith("/work"),
  },
  { href: "/about", label: "About", short: "About", match: (p: string) => p === "/about" },
];
