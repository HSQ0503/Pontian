import type { Metadata } from "next";
import { SchedulePreview } from "@/components/mf/Previews";

export const metadata: Metadata = { title: "Prazos e equipe" };

export default function Page() {
  return <SchedulePreview />;
}
