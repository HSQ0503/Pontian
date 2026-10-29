import { AtaWorkspace } from "@/components/mf/AtaWorkspace";

export default async function AtaPage({ params }: PageProps<"/mf/atas/[id]">) {
  const { id } = await params;
  return <AtaWorkspace id={id} />;
}
