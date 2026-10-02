import type { ReactNode } from "react";
import { Manrope, Space_Grotesk } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"], display: "swap" });
const headline = Space_Grotesk({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-frontier-headline",
});

export function FrontierShell({ children }: { children: ReactNode }) {
  return (
    <div
      lang="en"
      className={`pontian-root min-h-screen antialiased ${manrope.className} ${headline.variable}`}
    >
      {children}
    </div>
  );
}
