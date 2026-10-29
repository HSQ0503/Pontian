import type { Metadata } from "next";
import { NewAta } from "@/components/mf/NewAta";

export const metadata: Metadata = { title: "Nova ata" };

export default async function NewAtaPage({ searchParams }: PageProps<"/mf/atas/nova">) {
  const { projeto, modo } = await searchParams;
  return (
    <NewAta initialProject={typeof projeto === "string" ? projeto : undefined} initialMode={typeof modo === "string" ? modo : undefined} />
  );
}
