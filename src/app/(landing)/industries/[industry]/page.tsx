import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { industries, type Industry } from "@/lib/industries";
import { breadcrumbNode, graph, pageMetadata } from "@/lib/seo";
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

function industryMetadata(slug: string, description: Metadata["description"]): Metadata {
  const industry = industries.find((item) => item.slug === slug);
  if (!industry) notFound();
  return pageMetadata({ title: industry.name, description: description ?? industry.headline, path: `/industries/${industry.slug}`, socialTitle: `Pontian for ${industry.name}` });
}

export async function generateMetadata({ params }: PageProps<"/industries/[industry]">): Promise<Metadata> {
  const { industry: slug } = await params;
  switch (slug) {
    case "construction": return industryMetadata(slug, `${constructionHeadline} ${constructionSummary}`);
    case "design-engineering": return industryMetadata(slug, designEngineeringMetadata.description);
    case "logistics": return industryMetadata(slug, logisticsMetadata.description);
    case "manufacturing": return industryMetadata(slug, `${manufacturingHeadline} ${manufacturingSummary}`);
    case "retail": return industryMetadata(slug, retailMetadata.description);
    case "property-services": return industryMetadata(slug, propertyServicesMetadata.description);
    case "equipment-rental": return industryMetadata(slug, `${equipmentRentalHeadline} ${equipmentRentalSummary}`);
    default: notFound();
  }
}

export default async function IndustryPage({ params }: PageProps<"/industries/[industry]">) {
  const { industry: slug } = await params;
  const index = industries.findIndex((item) => item.slug === slug);
  const industry = industries[index];
  if (!industry) notFound();
  return (
    <>
      <JsonLd data={graph(breadcrumbNode([{ name: "Pontian", path: "/" }, { name: industry.name, path: `/industries/${industry.slug}` }]))} />
      <IndustryContent slug={slug} industry={industry} index={index} />
    </>
  );
}

function IndustryContent({ slug, industry, index }: { slug: string; industry: Industry; index: number }) {
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
