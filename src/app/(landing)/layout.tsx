import type { Viewport } from "next";
import { FrontierShell } from "@/components/landing/frontier-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { founderNodes, graph, organizationNode, websiteNode } from "@/lib/seo";

export const viewport: Viewport = {
  themeColor: "#080808",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <FrontierShell>
      <JsonLd data={graph(organizationNode(), websiteNode(), ...founderNodes())} />
      {children}
    </FrontierShell>
  );
}
