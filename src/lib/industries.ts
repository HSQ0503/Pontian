export type Industry = {
  slug: string; name: string; headline: string; tone: string; image: string;
  alt: string; noir?: boolean; imagePosition?: string; heroPosition?: string;
};

export const industries: Industry[] = [
  { slug: "construction", name: "Construction", headline: "Bespoke infrastructure for the jobsite.", tone: "clay", image: "/pontian/construction.png", alt: "Construction workers on a building site" },
  { slug: "design-engineering", name: "Design & Engineering", headline: "Built around the design process.", tone: "steel", image: "/pontian/design-engineering.jpeg", noir: true, alt: "Angular concrete architecture" },
  { slug: "logistics", name: "Logistics", headline: "Designed around a world in motion.", tone: "slate", image: "/pontian/logistics-truck.png", noir: true, alt: "Freight truck moving along a highway", heroPosition: "center 65%" },
  { slug: "manufacturing", name: "Manufacturing", headline: "Optimize for the factory floor.", tone: "sage", image: "/pontian/manufacturing.png", noir: true, alt: "Industrial robots on a manufacturing line" },
  { slug: "retail", name: "Retail", headline: "Built for every point of sale.", tone: "ochre", image: "/pontian/retail.png", noir: true, alt: "Shoppers and escalators in a retail center" },
  { slug: "property-services", name: "Property Services", headline: "Behind every well-run property.", tone: "graphite", image: "/pontian/property-services.png", noir: true, imagePosition: "center 32%", heroPosition: "center 32%", alt: "Property service professional working on a roof" },
  { slug: "equipment-rental", name: "Equipment Rental", headline: "Keep your fleet working.", tone: "slate", image: "/pontian/equipment-rental.png", noir: true, imagePosition: "70% center", heroPosition: "70% center", alt: "Heavy equipment trucks at a worksite" },
];
