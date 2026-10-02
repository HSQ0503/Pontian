import type { Metadata, Viewport } from "next";
import { FrontierShell } from "@/components/landing/frontier-shell";
import { SkormanPresentation } from "./presentation";

export const metadata: Metadata = {
  title: {
    absolute: "Built around Skorman | Pontian",
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
    description:
      "Technology for Skorman's properties and development decisions.",
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
    <FrontierShell>
      <SkormanPresentation />
    </FrontierShell>
  );
}
