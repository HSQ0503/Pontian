"use client";

import { ArrowRight, ArrowUpRight, Box, Brain, CalendarRange, FileText, FolderOpen, Mic, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { pick, useCopy } from "@/lib/mf/copy";
import { arCode, daysUntil, longDate, shortDate, todayIso } from "@/lib/mf/format";
import { buildRegistry } from "@/lib/mf/registry";
import { useMf } from "@/lib/mf/store";
import type { Meeting, Project, RgEntry } from "@/lib/mf/types";
import { Button, Card, CardHeader, cx, Empty, Input, LoadingPage, MeetingStatusTag, Page, PageHeader, RiskBars, Select, Tag } from "./ui";

type OpenAction = RgEntry & { project: Project };

function useOpenActions(projects: Project[], meetings: Meeting[]) {
  return useMemo(() => {
    const result: OpenAction[] = [];
    for (const project of projects) {
      for (const entry of buildRegistry(meetings, project.id).entries) {
        if (entry.status === "progress") result.push({ ...entry, project });
      }
    }
    return result.sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  }, [projects, meetings]);
}

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

export function Dashboard() {
  const mf = useMf();
  const { c, lang } = useCopy();
  const actions = useOpenActions(mf.projects, mf.meetings);
  if (!mf.ready) return <LoadingPage />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? c.dashboard.morning : hour < 18 ? c.dashboard.afternoon : c.dashboard.evening;
  const month = todayIso().slice(0, 7);
  const kpis = [
    { label: c.dashboard.kpiAtas, value: mf.meetings.filter((m) => m.date.startsWith(month)).length },
    { label: c.dashboard.kpiOpen, value: actions.length },
    { label: c.dashboard.kpiDue, value: actions.filter((a) => { const d = daysUntil(a.deadline); return d !== null && d >= 0 && d <= 7; }).length },
    { label: c.dashboard.kpiLate, value: actions.filter((a) => (daysUntil(a.deadline) ?? 0) < 0).length, alert: true },
  ];
  const projectOf = (id: string) => mf.projects.find((p) => p.id === id);
  const modules = [
    { href: "/mf/brain", icon: Brain, title: c.nav.brain, text: lang === "pt" ? "Perguntas sobre o projeto com resposta citada nas atas e documentos aprovados." : "Project questions answered with citations to approved minutes and documents." },
    { href: "/mf/prazos", icon: CalendarRange, title: c.nav.schedule, text: lang === "pt" ? "Cronogramas do Planejamento e carga declarada por pessoa, em uma linha do tempo." : "Planning schedules and declared load per person, on one timeline." },
    { href: "/mf/documentos", icon: FolderOpen, title: c.nav.documents, text: lang === "pt" ? "Registro de documentos e revisões ligado ao Autodesk Docs." : "Document and revision register linked to Autodesk Docs." },
    { href: "/mf/revit", icon: Box, title: c.nav.revit, text: lang === "pt" ? "Da planta aprovada ao modelo nativo, com revisão profissional." : "From approved plan to native model, with professional review." },
  ];

  return (
    <Page wide>
      <PageHeader
        eyebrow={longDate(todayIso(), lang)}
        title={greeting}
        lead={c.dashboard.lead}
        actions={
          <Button variant="primary" href="/mf/atas/nova" icon={<Plus className="size-4" />}>
            {c.newAta}
          </Button>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-mf-300 bg-mf-300 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-mf-100 px-6 py-6">
            <div className={cx("mf-num text-[38px] font-medium leading-none", kpi.alert && kpi.value ? "text-mf-rec" : "text-white")}>{kpi.value}</div>
            <div className="mt-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mf-600">{kpi.label}</div>
          </div>
        ))}
      </div>

      <Link
        href="/mf/atas/nova"
        className="group mt-6 flex items-center gap-5 overflow-hidden rounded-xl border border-mf-400 bg-[radial-gradient(90%_140%_at_0%_50%,#1c1c1c_0%,#090909_70%)] px-6 py-5 transition-colors hover:border-mf-700"
      >
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-white">
          <span className="mf-rec-ring absolute inset-0 rounded-full" />
          <Mic className="size-5 text-black" />
        </span>
        <div className="flex-1">
          <div className="text-[15px] font-semibold text-white">{c.dashboard.recordNow}</div>
          <div className="mt-0.5 text-[12.5px] text-mf-700">{c.dashboard.recordLead}</div>
        </div>
        <ArrowRight className="size-5 text-mf-600 transition-transform group-hover:translate-x-1 group-hover:text-white" />
      </Link>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={c.dashboard.actions} lead={c.dashboard.actionsLead} />
          {actions.length ? (
            <ul className="divide-y divide-mf-300">
              {actions.slice(0, 8).map((action) => (
                <li key={`${action.project.id}-${action.number}`}>
                  <Link href={`/mf/registro?projeto=${action.project.id}`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-mf-150 sm:flex-row sm:items-start sm:gap-4">
                    <span className="mf-num w-16 shrink-0 text-[12px] font-semibold text-white">{action.number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] leading-relaxed text-mf-900">{lang === "pt" ? action.pt : action.en}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-mf-600">
                        <span className="mf-num">ON {action.project.on}</span>
                        <span>{action.responsible || "-"}</span>
                        <span className="mf-num">{action.origins.join(" · ")}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <RiskBars risk={action.risk} lang={lang} showLabel={false} />
                      <DueLabel deadline={action.deadline} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-[13px] text-mf-700">{c.dashboard.noActions}</p>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title={c.dashboard.recent}
              action={
                <Link href="/mf/atas" className="text-[12px] font-semibold text-mf-700 hover:text-white">
                  {c.dashboard.seeAll}
                </Link>
              }
            />
            <ul className="divide-y divide-mf-300">
              {mf.meetings.slice(0, 5).map((meeting) => {
                const project = projectOf(meeting.projectId);
                return (
                  <li key={meeting.id}>
                    <Link href={`/mf/atas/${meeting.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-mf-150">
                      <span className="mf-num shrink-0 text-[12px] text-mf-700">{arCode(meeting.ar)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-white">{meeting.ata ? pick(meeting.ata.title, lang) : meeting.title || "-"}</div>
                        <div className="mf-num mt-0.5 text-[11px] text-mf-600">
                          ON {project?.on} · {shortDate(meeting.date)}
                        </div>
                      </div>
                      <MeetingStatusTag status={meeting.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader title={c.dashboard.projects} />
            <ul className="divide-y divide-mf-300">
              {mf.projects.map((project) => {
                const count = mf.meetings.filter((m) => m.projectId === project.id).length;
                return (
                  <li key={project.id}>
                    <Link href={`/mf/registro?projeto=${project.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-mf-150">
                      <span className="mf-num w-12 text-[15px] font-medium text-white">{project.on}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] text-mf-900">{project.name}</div>
                        <div className="text-[11px] text-mf-600">{project.client}</div>
                      </div>
                      <span className="mf-num text-[11.5px] text-mf-600">
                        {count} {c.projects.atas}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">{c.dashboard.modules}</h2>
            <p className="mt-1 text-[12.5px] text-mf-700">{c.dashboard.modulesLead}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link key={module.href} href={module.href} className="group rounded-xl border border-mf-300 bg-mf-100 p-5 transition-colors hover:border-mf-600">
              <div className="flex items-center justify-between">
                <module.icon className="size-5 text-white" strokeWidth={1.6} />
                <ArrowUpRight className="size-4 text-mf-600 transition-colors group-hover:text-white" />
              </div>
              <div className="mt-6 flex items-center gap-2">
                <span className="text-[14px] font-semibold text-white">{module.title}</span>
                <Tag className="h-[18px] px-1.5 text-[9px]">{c.preview}</Tag>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-mf-700">{module.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </Page>
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
                <thead className="border-b border-mf-300 text-[10.5px] uppercase tracking-[0.12em] text-mf-600">
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

