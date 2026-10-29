"use client";

import { ArrowRight, ArrowUpRight, Box, Brain, CalendarRange, Download, FileText, FolderOpen, Mic, PenLine, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { pick, useCopy, useTr } from "@/lib/mf/copy";
import { arCode, daysUntil, longDate, shortDate, todayIso } from "@/lib/mf/format";
import { buildRegistry } from "@/lib/mf/registry";
import { useMf } from "@/lib/mf/store";
import type { Meeting, Project, RgEntry } from "@/lib/mf/types";
import { Card, cx, LoadingPage, Page } from "./ui";

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
        <h1 className="mt-2.5 text-[28px] font-semibold text-white md:text-[32px]">{greeting}</h1>
        <p className="mt-1.5 text-[14px] text-mf-700">{tr("O que você quer fazer hoje?", "What would you like to do today?")}</p>
      </header>

      <section className="mt-7 border border-mf-400 bg-mf-100">
        <div className="flex flex-col gap-1 border-b border-mf-300 px-6 py-5">
          <h2 className="text-[15px] font-semibold text-white">{tr("Nova ata de reunião", "New meeting minutes")}</h2>
          <p className="text-[13px] text-mf-600">{tr("Escolha como a reunião chega. A IA faz o resto em cerca de um minuto.", "Choose how the meeting comes in. The AI does the rest in about a minute.")}</p>
        </div>
        <div className="grid gap-px bg-mf-300 xl:grid-cols-3">
          {starts.map((start) => (
            <Link
              key={start.href}
              href={start.href}
              className={cx("group flex items-center gap-4 px-6 py-5 transition-colors", start.primary ? "bg-white text-black hover:bg-mf-900" : "bg-mf-100 text-white hover:bg-mf-150")}
            >
              <span className={cx("flex size-10 shrink-0 items-center justify-center", start.primary ? "bg-black text-white" : "border border-mf-500 text-white")}>
                <start.icon className="size-[18px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold">{start.title}</span>
                <span className={cx("mt-0.5 block text-[12.5px]", start.primary ? "text-black/60" : "text-mf-600")}>{start.text}</span>
              </span>
              <ArrowRight className={cx("size-4 shrink-0 transition-transform group-hover:translate-x-0.5", start.primary ? "text-black" : "text-mf-600 group-hover:text-white")} />
            </Link>
          ))}
        </div>
        <ol className="grid border-t border-mf-300 sm:grid-cols-2 xl:grid-cols-4">
          {how.map((step, index) => (
            <li key={step.title} className={cx("flex gap-3 px-6 py-4", index > 0 && "border-t border-mf-300 sm:border-t-0", index % 2 === 1 && "sm:border-l", index > 1 && "sm:border-t xl:border-t-0", index === 2 && "xl:border-l")}>
              <span className="mf-num pt-px text-[11px] text-mf-600">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <span className="block text-[13px] font-medium text-white">{step.title}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-mf-600">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {drafts.length > 0 && (
        <section className="mt-6 border border-mf-400 border-l-2 border-l-mf-warn bg-mf-100">
          <div className="flex items-center justify-between gap-4 border-b border-mf-300 px-6 py-4">
            <div>
              <h2 className="text-[14px] font-semibold text-white">
                {drafts.length === 1 ? tr("1 ata aguardando revisão", "1 set of minutes awaiting review") : tr(`${drafts.length} atas aguardando revisão`, `${drafts.length} sets of minutes awaiting review`)}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-mf-600">{tr("Confira os itens e aprove para que entrem no Registro Geral.", "Check the items and approve them so they enter the General Register.")}</p>
            </div>
          </div>
          <ul className="divide-y divide-mf-300">
            {drafts.slice(0, 4).map((meeting) => (
              <li key={meeting.id}>
                <Link href={`/mf/atas/${meeting.id}`} className="group flex items-center gap-4 px-6 py-3 transition-colors hover:bg-mf-150">
                  <span className="mf-num w-16 shrink-0 text-[12px] text-mf-600">{arCode(meeting.ar)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-white">{meeting.ata ? pick(meeting.ata.title, lang) : meeting.title}</span>
                  <span className="hidden text-[12.5px] text-mf-600 sm:inline">ON {projectOf(meeting.projectId)?.on}</span>
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white">
                    {tr("Revisar", "Review")}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-mf-300 px-6 py-4">
            <div>
              <h2 className="mf-eyebrow text-white">{c.dashboard.actions}</h2>
              <p className="mt-1.5 text-[12.5px] text-mf-600">{c.dashboard.actionsLead}</p>
            </div>
            <p className="text-[12.5px] text-mf-600">
              <span className="font-semibold text-white">{actions.length}</span> {tr("abertas", "open")}
              <span className="mx-2 text-mf-500">·</span>
              <span className={cx("font-semibold", dueSoon ? "text-mf-warn" : "text-white")}>{dueSoon}</span> {tr("em 7 dias", "in 7 days")}
              <span className="mx-2 text-mf-500">·</span>
              <span className={cx("font-semibold", overdue ? "text-mf-rec" : "text-white")}>{overdue}</span> {tr("vencidas", "overdue")}
            </p>
          </div>
          {actions.length ? (
            <ul className="divide-y divide-mf-300">
              {actions.slice(0, 7).map((action) => (
                <li key={`${action.project.id}-${action.number}`}>
                  <Link href={`/mf/registro?projeto=${action.project.id}`} className="grid grid-cols-[64px_minmax(0,1fr)_96px] gap-4 px-6 py-3.5 transition-colors hover:bg-mf-150">
                    <span className="mf-num pt-px text-[12px] text-mf-700">{action.number}</span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-[13.5px] leading-snug text-mf-950">{lang === "pt" ? action.pt : action.en}</span>
                      <span className="mt-1 block truncate text-[12px] text-mf-600">
                        ON {action.project.on} · {action.responsible || tr("Sem responsável", "No owner")}
                      </span>
                    </span>
                    <DueCell deadline={action.deadline} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-12 text-center text-[13.5px] text-mf-600">{c.dashboard.noActions}</p>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between border-b border-mf-300 px-6 py-4">
              <h2 className="mf-eyebrow text-white">{c.dashboard.recent}</h2>
              <Link href="/mf/atas" className="text-[12.5px] font-medium text-mf-600 hover:text-white">
                {c.dashboard.seeAll}
              </Link>
            </div>
            {mf.meetings.length ? (
              <ul className="divide-y divide-mf-300">
                {mf.meetings.slice(0, 5).map((meeting) => (
                  <li key={meeting.id}>
                    <Link href={`/mf/atas/${meeting.id}`} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 px-6 py-3 transition-colors hover:bg-mf-150">
                      <span className="mf-num text-[12px] text-mf-700">{arCode(meeting.ar)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium text-white">{meeting.ata ? pick(meeting.ata.title, lang) : meeting.title || "-"}</span>
                        <span className="mt-0.5 block text-[12px] text-mf-600">
                          ON {projectOf(meeting.projectId)?.on} · {shortDate(meeting.date)}
                        </span>
                      </span>
                      <StatusText status={meeting.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-10 text-center text-[13.5px] text-mf-600">{c.atas.emptyLead}</p>
            )}
          </Card>

          <Card>
            <div className="border-b border-mf-300 px-6 py-4">
              <h2 className="mf-eyebrow text-white">{tr("Em breve", "Coming soon")}</h2>
              <p className="mt-1.5 text-[12.5px] text-mf-600">{c.dashboard.modulesLead}</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-mf-300">
              {soon.map((module) => (
                <Link key={module.href} href={module.href} className="group flex items-center gap-3 bg-mf-100 px-6 py-3.5 transition-colors hover:bg-mf-150">
                  <module.icon className="size-4 text-mf-600 group-hover:text-white" strokeWidth={1.75} />
                  <span className="flex-1 text-[13px] text-mf-800 group-hover:text-white">{module.title}</span>
                  <ArrowUpRight className="size-3.5 text-mf-500 group-hover:text-white" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

function DueCell({ deadline }: { deadline: string }) {
  const tr = useTr();
  const days = daysUntil(deadline);
  if (days === null) return <span className="text-right text-[12px] text-mf-600">{tr("Sem prazo", "No deadline")}</span>;
  const tone = days < 0 ? "text-mf-rec" : days <= 7 ? "text-mf-warn" : "text-mf-800";
  const label = days < 0 ? tr(`Vencida há ${-days} d`, `${-days} d overdue`) : days === 0 ? tr("Hoje", "Today") : tr(`Em ${days} d`, `In ${days} d`);
  return (
    <span className="text-right">
      <span className={cx("mf-num block text-[12.5px]", tone)}>{shortDate(deadline)}</span>
      <span className={cx("mt-0.5 block text-[11.5px]", days <= 7 ? tone : "text-mf-600")}>{label}</span>
    </span>
  );
}

function StatusText({ status }: { status: Meeting["status"] }) {
  const { c } = useCopy();
  const dot = { processing: "bg-mf-700 mf-blink", draft: "bg-mf-warn", approved: "bg-mf-ok", failed: "bg-mf-rec" }[status];
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-mf-700">
      <span className={cx("size-1.5", dot)} />
      {c.meetingStatus[status]}
    </span>
  );
}
