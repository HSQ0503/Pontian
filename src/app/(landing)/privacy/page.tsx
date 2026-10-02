import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { legalDetails, privacyPolicy } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: privacyPolicy.description,
  alternates: { canonical: "/privacy" },
  robots: { index: legalDetails.status === "published", follow: true },
};

export default function PrivacyPage() {
  return <LegalDocument document={privacyPolicy} />;
}
