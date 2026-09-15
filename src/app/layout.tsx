import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import { LocaleProvider } from "@/lib/i18n";
import { site } from "@/lib/site";
import "./globals.css";

const bodySerif = Source_Serif_4({
  variable: "--font-body-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
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
