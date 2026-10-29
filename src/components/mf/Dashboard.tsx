"use client";

import { ArrowRight, FileText, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { pick, useCopy, useTr } from "@/lib/mf/copy";
import { arCode, daysUntil, shortDate, todayIso } from "@/lib/mf/format";
import { buildRegistry } from "@/lib/mf/registry";
import { useMf } from "@/lib/mf/store";
import type { Meeting, Project, RgEntry } from "@/lib/mf/types";
import { Button, cx, LoadingPage, Page } from "./ui";

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
  const month = todayIso().slice(0, 7);
  const monthMinutes = mf.meetings.filter((m) => m.date.startsWith(month)).length;
  const activeProjects = new Set(actions.map((a) => a.project.id)).size;
  const projectOf = (id: string) => mf.projects.find((p) => p.id === id);
  const today = new Date().toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <Page wide>
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-white">{tr("Visão geral", "Overview")}</h1>
          <p className="mt-1 text-[13px] first-letter:uppercase text-mf-600">
            {today} · Minerbo-Fuchs Engenharia
          </p>
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

      <section className="mt-6 grid grid-cols-2 border border-mf-300 bg-mf-100 lg:grid-cols-4">
        <Metric label={tr("Ações em aberto", "Open actions")} value={actions.length} note={tr(`em ${activeProjects} projetos`, `across ${activeProjects} projects`)} />
        <Metric label={tr("Vencem nesta semana", "Due this week")} value={dueWeek} note={tr("próximos 7 dias", "next 7 days")} className="border-l border-mf-300" />
        <Metric label={tr("Vencidas", "Overdue")} value={overdue} note={overdue ? tr("precisam de atenção", "need attention") : tr("nenhuma pendência atrasada", "nothing late")} alert={overdue > 0} className="border-t border-mf-300 lg:border-l lg:border-t-0" />
        <Metric label={tr("Atas no mês", "Minutes this month")} value={monthMinutes} note={tr(`${drafts.length} aguardando revisão`, `${drafts.length} awaiting review`)} className="border-l border-t border-mf-300 lg:border-t-0" />
      </section>

      {drafts.length > 0 && (
        <Panel
          className="mt-6"
          title={tr("Aguardando revisão", "Awaiting review")}
          aside={<span className="text-[12.5px] text-mf-600">{tr("Revise e aprove para entrar no Registro Geral", "Review and approve to add them to the General Register")}</span>}
        >
          <Table columns={["w-[88px]", "", "w-[120px] hidden md:table-cell", "w-[110px] hidden sm:table-cell", "w-[96px]"]} head={[tr("Ata", "Minutes"), tr("Reunião", "Meeting"), tr("Projeto", "Project"), tr("Data", "Date"), ""]}>
            {drafts.slice(0, 5).map((meeting) => (
              <Row key={meeting.id} href={`/mf/atas/${meeting.id}`}>
                <td className="mf-num text-[12.5px] text-mf-700">{arCode(meeting.ar)}</td>
                <td className="truncate text-[13.5px] font-medium text-white">{meeting.ata ? pick(meeting.ata.title, lang) : meeting.title}</td>
                <td className="hidden whitespace-nowrap text-[13px] text-mf-700 md:table-cell">ON {projectOf(meeting.projectId)?.on}</td>
                <td className="mf-num hidden text-[12.5px] text-mf-700 sm:table-cell">{shortDate(meeting.date)}</td>
                <td className="text-right">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white">
                    {tr("Revisar", "Review")}
                    <ArrowRight className="size-3.5" />
                  </span>
                </td>
              </Row>
            ))}
          </Table>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title={tr("Próximas ações", "Upcoming actions")}
          aside={
            <Link href="/mf/registro" className="text-[12.5px] text-mf-600 transition-colors hover:text-white">
              {tr("Registro geral", "General register")} →
            </Link>
          }
        >
          {actions.length ? (
            <Table
              columns={["w-[76px]", "", "w-[160px] hidden 2xl:table-cell", "w-[92px] hidden md:table-cell", "w-[104px]"]}
              head={["Item", tr("Ação", "Action"), tr("Responsável", "Owner"), tr("Projeto", "Project"), tr("Prazo", "Due")]}
            >
              {actions.slice(0, 8).map((action) => (
                <Row key={`${action.project.id}-${action.number}`} href={`/mf/registro?projeto=${action.project.id}`}>
                  <td className="mf-num align-top text-[12.5px] text-mf-700">{action.number}</td>
                  <td className="align-top">
                    <span className="line-clamp-2 text-[13.5px] leading-snug text-mf-950">{lang === "pt" ? action.pt : action.en}</span>
                    <span className="mt-1 block truncate text-[12px] text-mf-600 2xl:hidden">{action.responsible || "—"}</span>
                  </td>
                  <td className="hidden truncate align-top text-[13px] text-mf-700 2xl:table-cell">{action.responsible || "—"}</td>
                  <td className="hidden whitespace-nowrap align-top text-[13px] text-mf-700 md:table-cell">ON {action.project.on}</td>
                  <td className="align-top text-right">
                    <Due deadline={action.deadline} />
                  </td>
                </Row>
              ))}
            </Table>
          ) : (
            <p className="px-5 py-12 text-center text-[13.5px] text-mf-600">{c.dashboard.noActions}</p>
          )}
        </Panel>

        <Panel
          title={tr("Atas recentes", "Recent minutes")}
          aside={
            <Link href="/mf/atas" className="text-[12.5px] text-mf-600 transition-colors hover:text-white">
              {tr("Ver todas", "View all")} →
            </Link>
          }
        >
          {mf.meetings.length ? (
            <Table columns={["w-[76px]", "", "w-[96px]"]} head={[tr("Ata", "Minutes"), tr("Reunião", "Meeting"), "Status"]}>
              {mf.meetings.slice(0, 6).map((meeting) => (
                <Row key={meeting.id} href={`/mf/atas/${meeting.id}`}>
                  <td className="mf-num align-top text-[12.5px] text-mf-700">{arCode(meeting.ar)}</td>
                  <td className="align-top">
                    <span className="block truncate text-[13.5px] font-medium text-white">{meeting.ata ? pick(meeting.ata.title, lang) : meeting.title || "—"}</span>
                    <span className="mt-0.5 block text-[12px] text-mf-600">
                      ON {projectOf(meeting.projectId)?.on} · {shortDate(meeting.date)}
                    </span>
                  </td>
                  <td className="align-top text-right">
                    <Status status={meeting.status} />
                  </td>
                </Row>
              ))}
            </Table>
          ) : (
            <p className="px-5 py-12 text-center text-[13.5px] text-mf-600">{c.atas.emptyLead}</p>
          )}
        </Panel>
      </div>
    </Page>
  );
}

function Metric({ label, value, note, alert, className }: { label: string; value: number; note: string; alert?: boolean; className?: string }) {
  return (
    <div className={cx("px-5 py-4", className)}>
      <div className="text-[12.5px] text-mf-600">{label}</div>
      <div className={cx("mt-1.5 text-[28px] font-semibold leading-none tabular-nums", alert ? "text-mf-rec" : "text-white")}>{value}</div>
      <div className="mt-2 text-[12px] text-mf-600">{note}</div>
    </div>
  );
}

function Panel({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("border border-mf-300 bg-mf-100", className)}>
      <div className="flex items-center justify-between gap-4 px-5 py-3.5">
        <h2 className="text-[14px] font-semibold text-white">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Table({ head, columns, children }: { head: string[]; columns: string[]; children: ReactNode }) {
  return (
    <table className="w-full table-fixed border-t border-mf-300">
      <thead>
        <tr className="border-b border-mf-300">
          {head.map((label, index) => (
            <th key={index} className={cx("px-5 py-2 text-left text-[11.5px] font-medium text-mf-600 last:text-right", columns[index])}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="[&_td]:px-5 [&_td]:py-3">{children}</tbody>
    </table>
  );
}

function Row({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => event.key === "Enter" && router.push(href)}
      className="cursor-pointer border-b border-mf-300 transition-colors last:border-0 hover:bg-mf-150"
    >
      {children}
    </tr>
  );
}

function Due({ deadline }: { deadline: string }) {
  const tr = useTr();
  const days = daysUntil(deadline);
  if (days === null) return <span className="text-[12.5px] text-mf-600">—</span>;
  const late = days < 0;
  return (
    <span className="inline-block text-right">
      <span className={cx("mf-num block text-[12.5px]", late ? "text-mf-rec" : "text-mf-900")}>{shortDate(deadline)}</span>
      <span className={cx("mt-0.5 block text-[11.5px]", late ? "text-mf-rec" : days <= 7 ? "text-mf-700" : "text-mf-600")}>
        {late ? tr(`${-days} d atrasada`, `${-days} d late`) : days === 0 ? tr("hoje", "today") : tr(`em ${days} d`, `in ${days} d`)}
      </span>
    </span>
  );
}

function Status({ status }: { status: Meeting["status"] }) {
  const { c } = useCopy();
  const dot = { processing: "bg-mf-700 mf-blink", draft: "bg-mf-warn", approved: "bg-mf-ok", failed: "bg-mf-rec" }[status];
  return (
    <span className="inline-flex items-center justify-end gap-2 text-[12.5px] text-mf-700">
      <span className={cx("size-1.5 rounded-full", dot)} />
      {c.meetingStatus[status]}
    </span>
  );
}
