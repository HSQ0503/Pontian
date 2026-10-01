import type { Viewport } from "next";
import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  themeColor: "#080808",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="en" className={`pontian-root min-h-screen antialiased ${manrope.className}`}>
      {children}
    </div>
  );
}
