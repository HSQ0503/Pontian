import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { LocaleProvider } from "@/lib/i18n";
import { brand, founders } from "@/lib/seo";
import { site } from "@/lib/site";
import "./globals.css";

// Self-hosted: next/font/google build-time fetches intermittently break Turbopack builds (vercel/next.js#99114).
const bodySerif = localFont({
  src: [
    { path: "../fonts/source-serif-4.woff2", weight: "300 600", style: "normal" },
    { path: "../fonts/source-serif-4-italic.woff2", weight: "300 600", style: "italic" },
  ],
  variable: "--font-body-serif",
  display: "swap",
  fallback: ["serif"],
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Pontian Technologies", template: "%s · Pontian" },
  description: brand.description,
  applicationName: "Pontian",
  authors: founders.map((founder) => ({ name: founder.name, ...("url" in founder ? { url: founder.url } : {}) })),
  creator: "Pontian Technologies",
  publisher: "Pontian Technologies",
  category: "technology",
  openGraph: {
    title: "Pontian Technologies",
    description: brand.description,
    siteName: "Pontian Technologies",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pontian Technologies" }],
  },
  twitter: { card: "summary_large_image", title: "Pontian Technologies", description: brand.description, images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#010206",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bodySerif.variable} h-full`}>
      <body className="grain min-h-full">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
