import type { Viewport } from "next";
import { FrontierShell } from "@/components/landing/frontier-shell";

export const viewport: Viewport = {
  themeColor: "#080808",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <FrontierShell>{children}</FrontierShell>
  );
}
