import type { Metadata } from "next";
import { BrainPreview } from "@/components/mf/Previews";

export const metadata: Metadata = { title: "Brain" };

export default function Page() {
  return <BrainPreview />;
}
