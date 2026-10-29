"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/lib/mf/copy";
import { buildRegistry } from "@/lib/mf/registry";
import { useMf } from "@/lib/mf/store";
import { AtaDocument, type DocView } from "./AtaDocument";
import { Button, Segmented } from "./ui";

export function PrintView({ id, view: initialView, auto }: { id: string; view: DocView; auto: boolean }) {
  const mf = useMf();
  const { c } = useCopy();
  const [view, setView] = useState(initialView);
  const printed = useRef(false);
  const meeting = mf.meetings.find((m) => m.id === id);
  const project = mf.projects.find((p) => p.id === meeting?.projectId);
  const ready = Boolean(mf.ready && meeting?.ata && project);

  useEffect(() => {
    if (!ready || !auto || printed.current) return;
    printed.current = true;
    document.fonts.ready.then(() => setTimeout(() => window.print(), 300));
  }, [ready, auto]);

  if (!mf.ready) return <div className="min-h-dvh bg-[#e9e9e9]" />;
  if (!meeting?.ata || !project) {
    return <div className="flex min-h-dvh items-center justify-center bg-[#e9e9e9] text-[14px] text-black">{c.ws.notFound}</div>;
  }

  const registry = buildRegistry(mf.meetings, meeting.projectId, meeting.id);
  return (
    <div className="min-h-dvh bg-[#e4e4e4] print:bg-white">
      <div className="mf-no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-mf-400 bg-black px-4 py-3">
        <Link href={`/mf/atas/${meeting.id}`} className="inline-flex items-center gap-2 text-[12.5px] font-medium text-mf-800 hover:text-white">
          <ArrowLeft className="size-4" />
          {c.back}
        </Link>
        <div className="flex items-center gap-2">
          <Segmented size="sm" value={view} onChange={setView} options={[{ value: "both", label: c.ws.both }, { value: "pt", label: "PT" }, { value: "en", label: "EN" }]} />
          <Button size="sm" variant="primary" icon={<Printer className="size-3.5" />} onClick={() => window.print()}>
            PDF
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-[920px] px-2 py-8 print:p-0">
        <AtaDocument meeting={meeting} project={project} ata={meeting.ata} subsections={[...registry.subsections, ...meeting.ata.subsections]} view={view} />
      </div>
    </div>
  );
}
