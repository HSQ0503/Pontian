import type { Metadata } from "next";
import { DocumentsPreview } from "@/components/mf/Previews";

export const metadata: Metadata = { title: "Documentos" };

export default function Page() {
  return <DocumentsPreview />;
}
