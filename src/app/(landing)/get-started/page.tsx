import type { Metadata } from "next";
import { IntakeQuiz } from "@/components/landing/intake-quiz";
import { industries } from "@/lib/industries";
import { intakeQuestions } from "@/lib/intake";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Tell us about your company. A better first conversation starts here.",
  alternates: { canonical: "/get-started" },
  robots: { index: false, follow: true },
};

function industryFromQuery(value: string | string[] | undefined) {
  const slug = Array.isArray(value) ? value[0] : value;
  const name = industries.find((item) => item.slug === slug)?.name;
  return name && intakeQuestions[0].options.includes(name) ? name : undefined;
}

export default async function GetStartedPage(props: PageProps<"/get-started">) {
  const { industry } = await props.searchParams;
  return <IntakeQuiz industry={industryFromQuery(industry)} />;
}
