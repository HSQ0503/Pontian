import { PrintView } from "@/components/mf/PrintView";

export default async function PrintPage({ params, searchParams }: PageProps<"/mf/atas/[id]/imprimir">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const view = query.view === "pt" || query.view === "en" ? query.view : "both";
  return <PrintView id={id} view={view} auto={query.auto === "1"} />;
}
