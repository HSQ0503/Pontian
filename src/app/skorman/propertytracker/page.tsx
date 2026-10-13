import type { Metadata, Viewport } from "next";
import { FrontierShell } from "@/components/landing/frontier-shell";
import { PropertyTracker } from "./property-tracker";

export const metadata: Metadata = {
  title: { absolute: "Property tracker | Pontian for Skorman Development" },
  description: "Land around Hills City Center worth a closer look.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#080808" };

export default function PropertyTrackerPage() {
  return (
    <FrontierShell>
      <PropertyTracker />
    </FrontierShell>
  );
}
