import type { Metadata } from "next";
import { Story } from "@/components/story/Story";

export const metadata: Metadata = {
  title: "Pontian",
  description: "Intelligence that works inside the company.",
  openGraph: { title: "Pontian", description: "Intelligence that works inside the company." },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Story />;
}
