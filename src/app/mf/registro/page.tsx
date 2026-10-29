import type { Metadata } from "next";
import { Registro } from "@/components/mf/Registro";

export const metadata: Metadata = { title: "Registro geral" };

export default async function RegistroPage({ searchParams }: PageProps<"/mf/registro">) {
  const { projeto } = await searchParams;
  return <Registro initialProject={typeof projeto === "string" ? projeto : undefined} />;
}
