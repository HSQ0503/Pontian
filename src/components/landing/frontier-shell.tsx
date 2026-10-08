import type { ReactNode } from "react";
import localFont from "next/font/local";

const manrope = localFont({
  src: "../../fonts/manrope.woff2",
  weight: "200 800",
  display: "swap",
  fallback: ["sans-serif"],
});
const headline = localFont({
  src: "../../fonts/space-grotesk-400.woff2",
  weight: "400",
  display: "swap",
  fallback: ["sans-serif"],
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
