"use client";

import { ChevronRight, FileText, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { pick, useCopy, useTr } from "@/lib/mf/copy";
import { arCode, daysUntil, shortDate, todayIso } from "@/lib/mf/format";
import { buildRegistry } from "@/lib/mf/registry";
import { useMf } from "@/lib/mf/store";
import type { Meeting, Project, RgEntry } from "@/lib/mf/types";
import { Button, cx, LoadingPage, MeetingStatusTag, Page, Section, Tag } from "./ui";

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

export function Dashboard() {
  const mf = useMf();
  const { c, lang } = useCopy();
  const tr = useTr();
  const actions = useOpenActions(mf.projects, mf.meetings);
  if (!mf.ready) return <LoadingPage />;

  const drafts = mf.meetings.filter((m) => m.status === "draft");
  const dueWeek = actions.filter((a) => {
    const days = daysUntil(a.deadline);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const overdue = actions.filter((a) => (daysUntil(a.deadline) ?? 0) < 0).length;
  const monthMinutes = mf.meetings.filter((m) => m.date.startsWith(todayIso().slice(0, 7))).length;
  const activeProjects = new Set(actions.map((a) => a.project.id)).size;
  const projectOf = (id: string) => mf.projects.find((p) => p.id === id);
  const today = new Date().toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Page wide>
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[13px] font-medium text-mf-600 first-letter:uppercase">{today}</p>
          <h1 className="mt-1 text-[30px] font-bold text-white">{tr("Visão geral", "Overview")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" href="/mf/atas/nova?modo=arquivo" icon={<Upload className="size-3.5" />}>
            {tr("Enviar gravação", "Upload recording")}
          </Button>
          <Button size="sm" href="/mf/atas/nova?modo=texto" icon={<FileText className="size-3.5" />}>
            {tr("Colar transcrição", "Paste transcript")}
          </Button>
          <Button size="sm" variant="primary" href="/mf/atas/nova?modo=gravar" icon={<span className="size-2 rounded-full bg-mf-rec" />}>
            {tr("Gravar reunião", "Record meeting")}
          </Button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={tr("Ações em aberto", "Open actions")} value={actions.length} note={tr(`em ${activeProjects} projetos`, `across ${activeProjects} projects`)} />
        <Metric label={tr("Vencem nesta semana", "Due this week")} value={dueWeek} note={tr("próximos 7 dias", "next 7 days")} />
        <Metric label={tr("Vencidas", "Overdue")} value={overdue} note={overdue ? tr("precisam de atenção", "need attention") : tr("tudo em dia", "all on time")} alert={overdue > 0} />
        <Metric label={tr("Atas no mês", "Minutes this month")} value={monthMinutes} note={tr(`${drafts.length} aguardando revisão`, `${drafts.length} awaiting review`)} />
      </section>

      {drafts.length > 0 && (
        <Section id="dashboard-review" className="mt-5" title={tr("Aguardando revisão", "Awaiting review")} count={drafts.length}>
          <List>
            {drafts.slice(0, 5).map((meeting) => (
              <ListRow
                key={meeting.id}
                href={`/mf/atas/${meeting.id}`}
                title={meeting.ata ? pick(meeting.ata.title, lang) : meeting.title}
                subtitle={`${arCode(meeting.ar)} · ON ${projectOf(meeting.projectId)?.on} · ${shortDate(meeting.date)}`}
                trailing={<span className="text-[13px] font-medium text-white">{tr("Revisar", "Review")}</span>}
              />
            ))}
          </List>
        </Section>
      )}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Section
          id="dashboard-actions"
          title={tr("Próximas ações", "Upcoming actions")}
          count={actions.length}
          aside={
            <Link href="/mf/registro" className="text-[13px] text-mf-600 transition-colors hover:text-white">
              {tr("Registro geral", "General register")}
            </Link>
          }
        >
          {actions.length ? (
            <List>
              {actions.slice(0, 8).map((action) => (
                <ListRow
                  key={`${action.project.id}-${action.number}`}
                  href={`/mf/registro?projeto=${action.project.id}`}
                  title={lang === "pt" ? action.pt : action.en}
                  clamp
                  subtitle={`${action.number} · ON ${action.project.on}${action.responsible ? ` · ${action.responsible}` : ""}`}
                  trailing={<Due deadline={action.deadline} />}
                />
              ))}
            </List>
          ) : (
            <p className="px-4 py-10 text-center text-[14px] text-mf-600">{c.dashboard.noActions}</p>
          )}
        </Section>

        <Section
          id="dashboard-recent"
          title={tr("Atas recentes", "Recent minutes")}
          count={mf.meetings.length}
          aside={
            <Link href="/mf/atas" className="text-[13px] text-mf-600 transition-colors hover:text-white">
              {tr("Ver todas", "View all")}
            </Link>
          }
        >
          {mf.meetings.length ? (
            <List>
              {mf.meetings.slice(0, 6).map((meeting) => (
                <ListRow
                  key={meeting.id}
                  href={`/mf/atas/${meeting.id}`}
                  title={meeting.ata ? pick(meeting.ata.title, lang) : meeting.title || "—"}
                  subtitle={`${arCode(meeting.ar)} · ON ${projectOf(meeting.projectId)?.on} · ${shortDate(meeting.date)}`}
                  trailing={<MeetingStatusTag status={meeting.status} />}
                />
              ))}
            </List>
          ) : (
            <p className="px-4 py-10 text-center text-[14px] text-mf-600">{c.atas.emptyLead}</p>
          )}
        </Section>
      </div>
    </Page>
  );
}

function Metric({ label, value, note, alert }: { label: string; value: number; note: string; alert?: boolean }) {
  return (
    <div className="rounded-2xl bg-mf-100 px-5 py-4 ring-1 ring-white/[0.06]">
      <div className="text-[13px] font-medium text-mf-600">{label}</div>
      <div className={cx("mf-num mt-1 text-[32px] font-bold leading-tight", alert ? "text-mf-rec" : "text-white")}>{value}</div>
      <div className="text-[12.5px] text-mf-600">{note}</div>
    </div>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="[&>li+li]:before:absolute [&>li+li]:before:inset-x-4 [&>li+li]:before:top-0 [&>li+li]:before:h-px [&>li+li]:before:bg-white/[0.06]">{children}</ul>;
}

function ListRow({ href, title, subtitle, trailing, clamp }: { href: string; title: string; subtitle: string; trailing: ReactNode; clamp?: boolean }) {
  return (
    <li className="relative">
      <Link href={href} className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.05]">
        <span className="min-w-0 flex-1">
          <span className={cx("block text-[14.5px] leading-snug text-white", clamp ? "line-clamp-2" : "truncate font-medium")}>{title}</span>
          <span className="mf-num mt-0.5 block truncate text-[12.5px] text-mf-600">{subtitle}</span>
        </span>
        <span className="shrink-0 text-right">{trailing}</span>
        <ChevronRight className="size-4 shrink-0 text-mf-500 transition-colors group-hover:text-mf-700" strokeWidth={2.25} />
      </Link>
    </li>
  );
}

function Due({ deadline }: { deadline: string }) {
  const tr = useTr();
  const days = daysUntil(deadline);
  if (days === null) return <span className="text-[13px] text-mf-600">—</span>;
  if (days < 0) return <Tag tone="rec">{tr(`${-days} d atrasada`, `${-days} d late`)}</Tag>;
  return (
    <span className="block">
      <span className="mf-num block text-[13px] text-mf-900">{shortDate(deadline)}</span>
      <span className="block text-[12px] text-mf-600">{days === 0 ? tr("hoje", "today") : tr(`em ${days} d`, `in ${days} d`)}</span>
    </span>
  );
}
