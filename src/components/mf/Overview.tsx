"use client";

import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { pick, useCopy } from "@/lib/mf/copy";
import { arCode, daysUntil, shortDate } from "@/lib/mf/format";
import { useMf } from "@/lib/mf/store";
import { Button, Card, cx, Empty, Input, LoadingPage, MeetingStatusTag, Page, PageHeader, Select } from "./ui";

export function DueLabel({ deadline }: { deadline: string }) {
  const { c } = useCopy();
  const days = daysUntil(deadline);
  if (days === null) return <span className="text-mf-600">-</span>;
  return (
    <span className={cx("mf-num text-[12px]", days < 0 ? "text-mf-rec" : days <= 7 ? "text-mf-warn" : "text-mf-800")}>
      {shortDate(deadline)}
      <span className="ml-1.5 text-[10.5px] opacity-80">
        {days < 0 ? c.actions.overdue : days === 0 ? c.actions.today : c.actions.inDays.replace("{n}", String(days))}
      </span>
    </span>
  );
}

export function AtasList() {
  const mf = useMf();
  const { c, lang } = useCopy();
  const [project, setProject] = useState("");
  const [query, setQuery] = useState("");
  if (!mf.ready) return <LoadingPage />;

  const rows = mf.meetings.filter((m) => {
    if (project && m.projectId !== project) return false;
    if (!query) return true;
    const haystack = `${arCode(m.ar)} ${m.title} ${m.ata ? `${m.ata.title.pt} ${m.ata.title.en}` : ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <Page wide>
      <PageHeader
        eyebrow={c.groups.operation}
        title={c.atas.title}
        lead={c.atas.lead}
        actions={
          <Button variant="primary" href="/mf/atas/nova" icon={<Plus className="size-4" />}>
            {c.newAta}
          </Button>
        }
      />
      {mf.meetings.length === 0 ? (
        <div className="mt-8">
          <Empty
            icon={<FileText className="size-5" />}
            title={c.atas.empty}
            lead={c.atas.emptyLead}
            action={
              <Button variant="primary" href="/mf/atas/nova" icon={<Plus className="size-4" />}>
                {c.newAta}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mf-600" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.search} className="pl-9" />
            </div>
            <Select value={project} onChange={(e) => setProject(e.target.value)} className="sm:w-80">
              <option value="">{c.all}</option>
              {mf.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  ON {p.on} · {p.name}
                </option>
              ))}
            </Select>
          </div>
          <Card className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-mf-300 text-[11.5px] text-mf-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">{c.atas.colAr}</th>
                    <th className="px-5 py-3 font-semibold">{c.atas.colTitle}</th>
                    <th className="px-5 py-3 font-semibold">{c.atas.colProject}</th>
                    <th className="px-5 py-3 font-semibold">{c.atas.colDate}</th>
                    <th className="px-5 py-3 font-semibold">{c.atas.colItems}</th>
                    <th className="px-5 py-3 font-semibold">{c.atas.colStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((meeting) => {
                    const p = mf.projects.find((x) => x.id === meeting.projectId);
                    return (
                      <tr key={meeting.id} className="group border-b border-mf-300 last:border-0 hover:bg-mf-150">
                        <td className="px-5 py-4">
                          <Link href={`/mf/atas/${meeting.id}`} className="mf-num text-[13px] font-medium text-white">
                            {arCode(meeting.ar)}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <Link href={`/mf/atas/${meeting.id}`} className="block text-[13.5px] font-medium text-white group-hover:underline">
                            {meeting.ata ? pick(meeting.ata.title, lang) : meeting.title || "-"}
                          </Link>
                          <span className="text-[11.5px] text-mf-600">{c.modality[meeting.modality]}</span>
                        </td>
                        <td className="px-5 py-4 text-[12.5px] text-mf-800">
                          <span className="mf-num text-white">ON {p?.on}</span> · {p?.name}
                        </td>
                        <td className="mf-num px-5 py-4 text-[12.5px] text-mf-800">{shortDate(meeting.date)}</td>
                        <td className="mf-num px-5 py-4 text-[12.5px] text-mf-800">{meeting.ata?.items.length ?? "-"}</td>
                        <td className="px-5 py-4">
                          <MeetingStatusTag status={meeting.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && <p className="px-5 py-10 text-center text-[13px] text-mf-700">{c.atas.noResults}</p>}
          </Card>
        </>
      )}
    </Page>
  );
}

