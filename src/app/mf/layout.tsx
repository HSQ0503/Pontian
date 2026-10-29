import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { MfShell } from "@/components/mf/Shell";
import "./mf.css";

// MF's own typography: Montserrat, as on minerbo-fuchs.com.br, plus a mono face for codes.
const sans = localFont({
  src: "../../fonts/montserrat-latin-wght.woff2",
  weight: "100 900",
  variable: "--font-mf-sans",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});

const mono = localFont({
  src: [
    { path: "../../fonts/jetbrains-mono-400.woff2", weight: "400" },
    { path: "../../fonts/jetbrains-mono-500.woff2", weight: "500" },
  ],
  variable: "--font-mf-code",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: { absolute: "Brain MF · Minerbo-Fuchs", template: "%s · Brain MF" },
  description: "Atas de reunião, registro geral e gestão de projetos da Minerbo-Fuchs.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function MfLayout({ children }: LayoutProps<"/mf">) {
  return (
    <div className={`mf-root ${sans.variable} ${mono.variable}`}>
      <MfShell>{children}</MfShell>
    </div>
  );
}
