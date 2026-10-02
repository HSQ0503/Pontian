import type { Metadata } from "next";
import { IntakeQuiz } from "@/components/landing/intake-quiz";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Tell us about your company. A better first conversation starts here.",
  robots: { index: false, follow: true },
};

export default function GetStartedPage() {
  return <IntakeQuiz />;
}
