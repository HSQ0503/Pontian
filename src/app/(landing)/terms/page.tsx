import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { legalDetails, termsOfService } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: termsOfService.description,
  alternates: { canonical: "/terms" },
  robots: { index: legalDetails.status === "published", follow: true },
};

export default function TermsPage() {
  return <LegalDocument document={termsOfService} />;
}
