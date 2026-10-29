import type { Metadata } from "next";
import { RevitPreview } from "@/components/mf/Previews";

export const metadata: Metadata = { title: "Revit" };

export default function Page() {
  return <RevitPreview />;
}
