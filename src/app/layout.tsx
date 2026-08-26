import type { Metadata } from "next";
import { Instrument_Serif, Spectral, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageTransition } from "@/components/page-transition";
import { SITE_URL } from "@/lib/site";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal"],
  variable: "--font-spectral",
  display: "swap",
});

const spectralItalic = Spectral({
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
  variable: "--font-spectral-italic",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "The Garden — Matthew Rizky Hartadi",
  description:
    "Field notes from a growing mind. Code, competition, and everything in the space between.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSerif.variable} ${spectral.variable} ${spectralItalic.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink">
        {/* CountUpFigure ships its number twice — a zero frame the client
            counts up, and the real figure — because the count has to start
            from zero in the prerendered HTML to avoid flashing the true value
            first. With scripts off nothing ever counts, so swap to the real
            figure. Written as raw HTML rather than a JSX <style> child so
            React leaves it inside the noscript instead of hoisting it into
            the head, where it would apply unconditionally. */}
        <noscript
          dangerouslySetInnerHTML={{
            __html:
              "<style>.countup-live{display:none}.countup-static{display:inline}</style>",
          }}
        />
        <Providers>
          <SiteHeader />
          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
