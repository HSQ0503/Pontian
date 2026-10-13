import type { Metadata, Viewport } from "next";
import { PropertyTracker } from "./property-tracker";

export const metadata: Metadata = {
  title: { absolute: "Property tracker | Skorman Development" },
  description: "Land around Hills City Center worth a closer look.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default function PropertyTrackerPage() {
  return <PropertyTracker />;
}
