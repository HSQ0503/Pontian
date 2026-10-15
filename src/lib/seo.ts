import type { Metadata } from "next";
import { site } from "./site";

export const brand = {
  name: "Pontian",
  alternateNames: ["Pontian Technologies"],
  tagline: "Frontier technology partner for industrial operations",
  description:
    "Pontian Technologies builds custom operational software, data systems and AI tools around how a business actually works, connecting records scattered across accounting software, operational systems, documents, spreadsheets and messages into practical workflows, and keeps supporting them after the first build.",
};

// Machine-readable only. The founders are not named in visible page copy.
export const founders = [
  {
    id: `${site.url}/#shouqi-han`,
    name: "Shouqi Han",
    jobTitle: "Co-founder",
    url: "https://shouqihan.com",
    sameAs: ["https://shouqihan.com", "https://www.shouqihan.com"],
  },
  {
    id: `${site.url}/#gustavo-campos`,
    name: "Gustavo Campos",
    jobTitle: "Co-founder",
  },
] as const;

export const organizationId = `${site.url}/#organization`;
export const websiteId = `${site.url}/#website`;

export const absoluteUrl = (path = "/") => new URL(path, site.url).toString();

const ogImage = { url: "/og.png", width: 1200, height: 630, alt: "Pontian Technologies" };

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  socialTitle?: string;
  absoluteTitle?: boolean;
  type?: "website" | "article";
  index?: boolean;
};

// Next merges metadata shallowly, so every page that sets openGraph must carry the full object.
export function pageMetadata({ title, description, path, socialTitle, absoluteTitle = false, type = "website", index = true }: PageMetadataInput): Metadata {
  const shared = socialTitle ?? title;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title: shared, description, url: path, siteName: "Pontian Technologies", type, locale: "en_US", images: [ogImage] },
    twitter: { card: "summary_large_image", title: shared, description, images: [ogImage.url] },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}

export function founderNodes() {
  return founders.map((founder) => ({
    "@type": "Person",
    "@id": founder.id,
    name: founder.name,
    jobTitle: founder.jobTitle,
    worksFor: { "@id": organizationId },
    affiliation: { "@id": organizationId },
    ...("url" in founder ? { url: founder.url, sameAs: founder.sameAs, mainEntityOfPage: founder.url } : {}),
  }));
}

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": organizationId,
    name: brand.name,
    alternateName: brand.alternateNames,
    url: absoluteUrl("/"),
    logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png") },
    image: absoluteUrl("/og.png"),
    slogan: brand.tagline,
    description: brand.description,
    founder: founders.map((founder) => ({ "@id": founder.id })),
    telephone: `+${site.phone}`,
    knowsAbout: [
      "Custom operational software",
      "Business process automation",
      "Data systems and integration",
      "Applied artificial intelligence",
      "AI tools for operations",
      "Construction technology",
      "Engineering knowledge management",
      "Logistics and fleet software",
      "Manufacturing software",
      "Retail analytics",
      "Property services software",
      "Equipment rental software",
    ],
    subjectOf: { "@id": `${absoluteUrl("/case-studies")}#collection` },
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    name: brand.name,
    alternateName: brand.alternateNames,
    url: absoluteUrl("/"),
    description: brand.description,
    inLanguage: "en",
    publisher: { "@id": organizationId },
    creator: founders.map((founder) => ({ "@id": founder.id })),
  };
}

export function breadcrumbNode(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
