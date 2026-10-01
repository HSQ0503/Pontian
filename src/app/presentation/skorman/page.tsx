import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SkormanPresentation } from "./presentation";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    absolute: "From the first site visit to opening day | Pontian × Skorman",
  },
  description:
    "Proposed tools to help Skorman find sites, attract renters and visitors, and track development decisions.",
  robots: { index: false, follow: false },
  icons: {
    icon: {
      url: "/pontian/frontier-logo.png",
      type: "image/png",
      sizes: "any",
    },
    apple: "/pontian/frontier-logo.png",
  },
  openGraph: {
    title: "Pontian × Skorman Development",
    description: "From the first site visit to opening day.",
    images: [
      {
        url: "/pontian/frontier-logo.png",
        width: 2000,
        height: 2000,
        alt: "Pontian's three-square mark",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Pontian × Skorman",
    images: ["/pontian/frontier-logo.png"],
  },
};

export const viewport: Viewport = { themeColor: "#080808" };

export default function SkormanPage() {
  return (
    <div lang="en" className={inter.className}>
      <SkormanPresentation />
    </div>
  );
}
