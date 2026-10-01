import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SkormanPresentation } from "./presentation";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { absolute: "A clearer view of what comes next | Pontian × Skorman" },
  description:
    "A conversation about finding opportunities, bringing people to properties, and making development easier to oversee.",
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
    description: "A clearer view of what comes next.",
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
