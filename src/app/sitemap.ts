import type { MetadataRoute } from "next";
import { caseStudies, caseStudyHref } from "@/lib/case-studies";
import { industries } from "@/lib/industries";
import { legalDetails } from "@/lib/legal";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const legal = legalDetails.status === "published" ? ["/privacy", "/terms"] : [];
  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/case-studies"), lastModified, changeFrequency: "monthly", priority: 0.9 },
    ...caseStudies.map((study) => ({ url: absoluteUrl(caseStudyHref(study.slug)), lastModified, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...industries.map((industry) => ({ url: absoluteUrl(`/industries/${industry.slug}`), lastModified, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: absoluteUrl("/contact"), lastModified, changeFrequency: "yearly", priority: 0.5 },
    ...legal.map((path) => ({ url: absoluteUrl(path), lastModified, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
