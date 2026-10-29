"use client";

import { ArrowRight, ArrowUpRight, Box, Brain, CalendarRange, CheckCheck, Download, FileText, FolderOpen, Mic, PenLine, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { pick, useCopy, useTr } from "@/lib/mf/copy";
import { arCode, daysUntil, longDate, shortDate, todayIso } from "@/lib/mf/format";
import { buildRegistry } from "@/lib/mf/registry";
import { useMf } from "@/lib/mf/store";
import type { Meeting, Project, RgEntry } from "@/lib/mf/types";
import { DueLabel } from "./Overview";
import { Card, CardHeader, cx, LoadingPage, MeetingStatusTag, Page, RiskBars } from "./ui";

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? c.dashboard.morning : hour < 18 ? c.dashboard.afternoon : c.dashboard.evening;
  const drafts = mf.meetings.filter((m) => m.status === "draft");
  const overdue = actions.filter((a) => (daysUntil(a.deadline) ?? 0) < 0).length;
  const dueSoon = actions.filter((a) => {
    const days = daysUntil(a.deadline);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const projectOf = (id: string) => mf.projects.find((p) => p.id === id);

  const starts = [
    { href: "/mf/atas/nova?modo=gravar", icon: Mic, title: tr("Gravar reunião", "Record a meeting"), text: tr("Comece a gravar agora pelo computador.", "Start recording now from this computer."), primary: true },
    { href: "/mf/atas/nova?modo=arquivo", icon: Upload, title: tr("Enviar gravação", "Upload a recording"), text: tr("Áudio ou vídeo do Teams ou do celular.", "Audio or video from Teams or a phone.") },
    { href: "/mf/atas/nova?modo=texto", icon: FileText, title: tr("Colar transcrição", "Paste a transcript"), text: tr("Texto pronto do Teams, Zoom ou Meet.", "Ready text from Teams, Zoom or Meet.") },
  ];
  const how = [
    { icon: Mic, title: tr("Grave ou envie", "Record or upload"), text: tr("A reunião entra por gravação, arquivo ou texto.", "The meeting comes in as a recording, file or text.") },
    { icon: Sparkles, title: tr("A IA escreve", "AI drafts it"), text: tr("Itens por disciplina, em PT e EN, no modelo do RG.", "Items by discipline, in PT and EN, in the RG format.") },
    { icon: PenLine, title: tr("Você revisa", "You review"), text: tr("Clique em qualquer item para corrigir.", "Click any item to correct it.") },
    { icon: Download, title: tr("Aprove e baixe", "Approve and download"), text: tr("PDF da ata e linhas prontas para o RG.", "Minutes PDF and rows ready for the RG.") },
  ];
  const soon = [
    { href: "/mf/brain", icon: Brain, title: c.nav.brain },
    { href: "/mf/prazos", icon: CalendarRange, title: c.nav.schedule },
    { href: "/mf/documentos", icon: FolderOpen, title: c.nav.documents },
    { href: "/mf/revit", icon: Box, title: c.nav.revit },
  ];

  return (
    <Page wide>
      <header>
        <div className="mf-eyebrow text-mf-600">{longDate(todayIso(), lang)}</div>
        <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.01em] text-white md:text-[38px]">{greeting}</h1>
        <p className="mt-2 text-[15px] text-mf-700">{tr("O que você quer fazer hoje?", "What would you like to do today?")}</p>
      </header>

      <section className="mt-8 overflow-hidden rounded-none border border-mf-400 bg-mf-100">
        <div className="flex flex-col gap-2 px-6 pt-6 sm:px-8 sm:pt-8">
          <h2 className="text-[20px] font-semibold text-white">{tr("Nova ata de reunião", "New meeting minutes")}</h2>
          <p className="text-[14px] text-mf-700">{tr("Escolha como a reunião chega. A IA faz o resto em cerca de um minuto.", "Choose how the meeting comes in. The AI does the rest in about a minute.")}</p>
        </div>
        <div className="grid gap-3 p-6 sm:p-8 xl:grid-cols-3">
          {starts.map((start) => (
            <Link
              key={start.href}
              href={start.href}
              className={cx(
                "group flex items-center gap-4 rounded-none border p-4 transition-colors xl:flex-col xl:items-start xl:p-5",
                start.primary ? "border-white bg-white text-black hover:bg-mf-900" : "border-mf-400 bg-black/40 text-white hover:border-mf-600 hover:bg-mf-150",
              )}
            >
              <span className={cx("relative flex size-12 shrink-0 items-center justify-center rounded-none", start.primary ? "bg-black text-white" : "bg-mf-200")}>
                <start.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[16px] font-semibold">
                  {start.title}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className={cx("mt-1 block text-[13.5px] leading-snug", start.primary ? "text-black/65" : "text-mf-700")}>{start.text}</span>
              </span>
            </Link>
          ))}
        </div>
        <ol className="grid border-t border-mf-300 sm:grid-cols-2 xl:grid-cols-4">
          {how.map((step, index) => (
            <li key={step.title} className={cx("flex gap-3.5 px-6 py-5 sm:px-8", index > 0 && "border-t border-mf-300 sm:border-t-0", index % 2 === 1 && "sm:border-l", index > 1 && "sm:border-t xl:border-t-0", index === 2 && "xl:border-l")}>
              <span className="mf-num shrink-0 pt-0.5 text-[12px] text-mf-600">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <span className="block text-[14px] font-semibold text-white">{step.title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-mf-700">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {drafts.length > 0 && (
        <section className="mt-6 rounded-none border border-mf-warn/30 bg-mf-warn/[0.06] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-none bg-mf-warn/15 text-mf-warn">
              <CheckCheck className="size-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-white">
                {drafts.length === 1 ? tr("1 ata aguardando sua revisão", "1 set of minutes awaiting your review") : tr(`${drafts.length} atas aguardando sua revisão`, `${drafts.length} sets of minutes awaiting your review`)}
              </h2>
              <p className="text-[13px] text-mf-700">{tr("Confira os itens e aprove para que entrem no Registro Geral.", "Check the items and approve them so they enter the General Register.")}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {drafts.slice(0, 4).map((meeting) => (
              <Link key={meeting.id} href={`/mf/atas/${meeting.id}`} className="flex items-center gap-3 rounded-none border border-mf-400 bg-black/40 px-4 py-3 transition-colors hover:border-mf-600">
                <span className="mf-num text-[12.5px] text-mf-800">{arCode(meeting.ar)}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white">{meeting.ata ? pick(meeting.ata.title, lang) : meeting.title}</span>
                <span className="text-[13px] font-semibold text-white">{tr("Revisar", "Review")}</span>
                <ArrowRight className="size-4 text-white" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title={c.dashboard.actions}
            lead={c.dashboard.actionsLead}
            action={
              <div className="hidden gap-2 sm:flex">
                <Stat value={actions.length} label={tr("abertas", "open")} />
                <Stat value={dueSoon} label={tr("7 dias", "7 days")} tone={dueSoon ? "warn" : undefined} />
                <Stat value={overdue} label={tr("vencidas", "overdue")} tone={overdue ? "rec" : undefined} />
              </div>
            }
          />
          {actions.length ? (
            <ul className="divide-y divide-mf-300">
              {actions.slice(0, 7).map((action) => (
                <li key={`${action.project.id}-${action.number}`}>
                  <Link href={`/mf/registro?projeto=${action.project.id}`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-mf-150 sm:flex-row sm:items-start sm:gap-4">
                    <span className="mf-num w-16 shrink-0 text-[13px] font-semibold text-white">{action.number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[14px] leading-relaxed text-mf-900">{lang === "pt" ? action.pt : action.en}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-mf-600">
                        <span className="mf-num">ON {action.project.on}</span>
                        <span>{action.responsible || tr("Sem responsável", "No owner")}</span>
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
            <p className="px-5 py-12 text-center text-[14px] text-mf-700">{c.dashboard.noActions}</p>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title={c.dashboard.recent}
              action={
                <Link href="/mf/atas" className="text-[13px] font-semibold text-mf-700 hover:text-white">
                  {c.dashboard.seeAll}
                </Link>
              }
            />
            {mf.meetings.length ? (
              <ul className="divide-y divide-mf-300">
                {mf.meetings.slice(0, 5).map((meeting) => (
                  <li key={meeting.id}>
                    <Link href={`/mf/atas/${meeting.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-mf-150">
                      <span className="mf-num shrink-0 text-[12.5px] text-mf-700">{arCode(meeting.ar)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium text-white">{meeting.ata ? pick(meeting.ata.title, lang) : meeting.title || "-"}</div>
                        <div className="mf-num mt-0.5 text-[12px] text-mf-600">
                          ON {projectOf(meeting.projectId)?.on} · {shortDate(meeting.date)}
                        </div>
                      </div>
                      <MeetingStatusTag status={meeting.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-[14px] text-mf-700">{c.atas.emptyLead}</p>
            )}
          </Card>

          <Card>
            <CardHeader title={tr("Em breve", "Coming soon")} lead={c.dashboard.modulesLead} />
            <div className="grid grid-cols-2 gap-px bg-mf-300">
              {soon.map((module) => (
                <Link key={module.href} href={module.href} className="group flex items-center gap-3 bg-mf-100 px-5 py-4 transition-colors hover:bg-mf-150">
                  <module.icon className="size-4 text-mf-700 group-hover:text-white" strokeWidth={1.75} />
                  <span className="flex-1 text-[13.5px] font-medium text-mf-900">{module.title}</span>
                  <ArrowUpRight className="size-3.5 text-mf-600 group-hover:text-white" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: "warn" | "rec" }) {
  return (
    <span className={cx("inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-none border px-2.5 py-1", tone === "rec" ? "border-mf-rec/40 text-mf-rec" : tone === "warn" ? "border-mf-warn/40 text-mf-warn" : "border-mf-400 text-white")}>
      <span className="mf-num text-[14px] font-medium">{value}</span>
      <span className="text-[11.5px] opacity-80">{label}</span>
    </span>
  );
}
