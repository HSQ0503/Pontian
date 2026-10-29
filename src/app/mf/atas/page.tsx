import type { Metadata } from "next";
import { AtasList } from "@/components/mf/Overview";

export const metadata: Metadata = { title: "Atas de reunião" };

export default function Page() {
  return <AtasList />;
}
