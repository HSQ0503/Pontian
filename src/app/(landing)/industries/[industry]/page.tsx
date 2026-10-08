import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { industries } from "@/lib/industries";
import { ConstructionPage, constructionHeadline, constructionSummary } from "./construction";
import { DesignEngineeringPage, designEngineeringMetadata } from "./design-engineering";
import { EquipmentRentalPage, equipmentRentalHeadline, equipmentRentalSummary } from "./equipment-rental";
import { LogisticsPage, logisticsMetadata } from "./logistics";
import { ManufacturingPage, manufacturingHeadline, manufacturingSummary } from "./manufacturing";
import { PropertyServicesPage, propertyServicesMetadata } from "./property-services";
import { RetailPage, retailMetadata } from "./retail";

export function generateStaticParams() {
  return industries.map((industry) => ({ industry: industry.slug }));
}

function industryMetadata(slug: string, description: string): Metadata {
  const industry = industries.find((item) => item.slug === slug);
  if (!industry) notFound();
  const title = `Pontian for ${industry.name}`;
  const url = `/industries/${industry.slug}`;
  return {
    title: industry.name,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Pontian", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pontian" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export async function generateMetadata({ params }: PageProps<"/industries/[industry]">): Promise<Metadata> {
  const { industry: slug } = await params;
  switch (slug) {
    case "construction": return industryMetadata(slug, `${constructionHeadline} ${constructionSummary}`);
    case "design-engineering": return designEngineeringMetadata;
    case "logistics": return logisticsMetadata;
    case "manufacturing": return industryMetadata(slug, `${manufacturingHeadline} ${manufacturingSummary}`);
    case "retail": return retailMetadata;
    case "property-services": return propertyServicesMetadata;
    case "equipment-rental": return industryMetadata(slug, `${equipmentRentalHeadline} ${equipmentRentalSummary}`);
    default: notFound();
  }
}

export default async function IndustryPage({ params }: PageProps<"/industries/[industry]">) {
  const { industry: slug } = await params;
  const index = industries.findIndex((item) => item.slug === slug);
  const industry = industries[index];
  if (!industry) notFound();
  const next = industries[(index + 1) % industries.length];
  switch (slug) {
    case "construction": return <ConstructionPage industry={industry} index={index} next={next} />;
    case "design-engineering": return <DesignEngineeringPage />;
    case "logistics": return <LogisticsPage index={index} />;
    case "manufacturing": return <ManufacturingPage industry={industry} index={index} next={next} />;
    case "retail": return <RetailPage />;
    case "property-services": return <PropertyServicesPage />;
    case "equipment-rental": return <EquipmentRentalPage industry={industry} index={index} next={next} />;
    default: notFound();
  }
}
