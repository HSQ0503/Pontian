import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { LocaleProvider } from "@/lib/i18n";
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
  title: { default: "Pontian", template: "%s · Pontian" },
  description: "A small technology company doing big things.",
  openGraph: {
    title: "Pontian",
    description: "A small technology company doing big things.",
    siteName: "Pontian",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pontian" }],
  },
  twitter: { card: "summary_large_image", title: "Pontian", images: ["/og.png"] },
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
