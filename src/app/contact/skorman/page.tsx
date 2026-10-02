import type { Metadata } from "next";
import { IntakeQuiz } from "@/components/landing/intake-quiz";
import { FrontierShell } from "@/components/landing/frontier-shell";

export const metadata: Metadata = {
  title: "Connect with Pontian | Skorman",
  robots: { index: false, follow: true },
};

export default function SkormanContactPage() {
  return <FrontierShell><IntakeQuiz contactOnly /></FrontierShell>;
}
