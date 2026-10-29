import type { Metadata } from "next";
import { Help } from "@/components/mf/Help";

export const metadata: Metadata = { title: "Como usar" };

export default function HelpPage() {
  return <Help />;
}
