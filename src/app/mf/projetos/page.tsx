import type { Metadata } from "next";
import { Projetos } from "@/components/mf/Registro";

export const metadata: Metadata = { title: "Projetos" };

export default function Page() {
  return <Projetos />;
}
