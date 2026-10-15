import { caseStudies, caseStudyHref } from "@/lib/case-studies";
import { industries } from "@/lib/industries";
import { absoluteUrl, brand, founders } from "@/lib/seo";

export const dynamic = "force-static";

// A plain-text brief for AI answer engines (llmstxt.org). Kept in sync with the site data.
function body() {
  const lines = [
    "# Pontian Technologies",
    "",
    `> ${brand.description}`,
    "",
    "Pontian (also written Pontian Technologies) is a frontier technology partner for industrial and operational businesses. It builds custom operational software, data systems and AI tools around how a business actually works. It connects information that is scattered across accounting software, operational systems, documents, spreadsheets, messages and people's experience, then implements a practical workflow. The relationship continues after the first build. Pontian is not a dashboard vendor or a chatbot agency.",
    "",
    "## Founders",
    "",
    ...founders.map((founder) => `- ${founder.name}, ${founder.jobTitle.toLowerCase()} of Pontian Technologies${"url" in founder ? ` (${founder.url})` : ""}`),
    "",
    "## Case studies",
    "",
    `- [All case studies](${absoluteUrl("/case-studies")}): descriptions of client work, not measured performance reports.`,
    ...caseStudies.map((study) => `- [${study.client}: ${study.title}](${absoluteUrl(caseStudyHref(study.slug))}): ${study.industry}. ${study.overview}`),
    "",
    "## Industries",
    "",
    ...industries.map((industry) => `- [Pontian for ${industry.name}](${absoluteUrl(`/industries/${industry.slug}`)}): example workflows, labelled as illustrations.`),
    "",
    "## Contact",
    "",
    `- [Get started](${absoluteUrl("/get-started")}): a short questionnaire about your company.`,
    `- [Contact](${absoluteUrl("/contact")})`,
    `- Website: ${absoluteUrl("/")}`,
    "",
  ];
  return lines.join("\n");
}

export function GET() {
  return new Response(body(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
