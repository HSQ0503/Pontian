"use client";

import {
  ArrowLeft,
  AudioLines,
  Check,
  ChevronDown,
  CircleAlert,
  Download,
  Ellipsis,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  ListChecks,
  Lock,
  Pencil,
  PenLine,
  Plus,
  Printer,
  RefreshCw,
  Trash,
  TriangleAlert,
  Undo2,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pick, useCopy, useTr } from "@/lib/mf/copy";
import { arCode, clock, download, durationLabel, longDate, meetingDuration, transcriptFileName } from "@/lib/mf/format";
import { runPipeline, transcriptText, useJob, type JobView } from "@/lib/mf/pipeline";
import { buildRegistry, numberAta, resolveSubsection } from "@/lib/mf/registry";
import { sectionOf } from "@/lib/mf/sections";
import { deleteMeeting, getMf, patchMeeting, useMf } from "@/lib/mf/store";
import type { AtaItem, Bilingual, Meeting, Project } from "@/lib/mf/types";
import { registryWorkbook } from "@/lib/mf/xlsx";
import { AtaDocument, type DocView } from "./AtaDocument";
import { ActionPlanPanel, blankItem, ItemDrawer, MetaDrawer, SpeakersPanel, TranscriptPanel } from "./AtaPanels";
import { Button, Card, cx, Empty, Field, Input, LoadingPage, MeetingStatusTag, Modal, Page, Segmented, Tag } from "./ui";

type Tab = "ata" | "transcript" | "speakers" | "actions";

export function AtaWorkspace({ id }: { id: string }) {
  const mf = useMf();
  const { c } = useCopy();
  if (!mf.ready) return <LoadingPage />;
  const meeting = mf.meetings.find((m) => m.id === id);
  const project = mf.projects.find((p) => p.id === meeting?.projectId);
  if (!meeting || !project) {
    return (
      <Page>
        <Empty icon={<FileText className="size-5" />} title={c.ws.notFound} action={<Button href="/mf/atas">{c.back}</Button>} />
      </Page>
    );
  }
  return <Workspace meeting={meeting} project={project} meetings={mf.meetings} />;
}

// Saves edited items and renumbers the ata against the project's current registry.
async function commitItems(meeting: Meeting, items: AtaItem[], newSubsection?: { itemId: string; title: Bilingual }) {
  const registry = buildRegistry(getMf().meetings, meeting.projectId, meeting.id);
  const known = new Map([...registry.subsections, ...meeting.ata!.subsections].map((sub) => [sub.code, sub]));
  const placed = items.map((item) => {
    if (item.updates) return item;
    if (newSubsection?.itemId === item.id) return { ...item, subsection: resolveSubsection(item.section, null, newSubsection.title, known) };
    return { ...item, subsection: resolveSubsection(item.section, item.subsection || null, null, known) };
  });
  const own = [...known.values()].filter((sub) => !registry.subsections.some((r) => r.code === sub.code));
  const numbered = numberAta(placed, own, registry, meeting.ar, meeting.date);
  await patchMeeting(meeting.id, { ata: { ...meeting.ata!, items: numbered.items, subsections: numbered.subsections } });
}

function Workspace({ meeting, project, meetings }: { meeting: Meeting; project: Project; meetings: Meeting[] }) {
  const { c, lang } = useCopy();
  const tr = useTr();
  const router = useRouter();
  const job = useJob(meeting.id);
  const [tab, setTab] = useState<Tab>("ata");
  const [view, setView] = useState<DocView>("both");
  const [editing, setEditing] = useState<{ item: AtaItem; isNew: boolean } | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [approving, setApproving] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "regenerate" | null>(null);
  const [focus, setFocus] = useState<{ time: number; key: number } | null>(null);

  const ata = meeting.ata;
  const approved = meeting.status === "approved";
  const registry = buildRegistry(meetings, meeting.projectId, meeting.id);
  const subsections = [...registry.subsections, ...(ata?.subsections ?? [])];
  const laterApproved = meetings.some((m) => m.projectId === meeting.projectId && m.status === "approved" && m.ar > meeting.ar);

  function jump(time: number) {
    setEditing(null);
    setTab("transcript");
    setFocus({ time, key: Date.now() });
  }

  async function saveItem(item: AtaItem, newSubsection: Bilingual | null) {
    if (!ata) return;
    const exists = ata.items.some((i) => i.id === item.id);
    const items = exists ? ata.items.map((i) => (i.id === item.id ? item : i)) : [...ata.items, item];
    await commitItems(meeting, items, newSubsection ? { itemId: item.id, title: newSubsection } : undefined);
    setEditing(null);
  }

  async function removeItem(item: AtaItem) {
    if (!ata) return;
    await commitItems(meeting, ata.items.filter((i) => i.id !== item.id));
    setEditing(null);
  }

  async function updateAction(item: AtaItem) {
    if (!ata) return;
    await patchMeeting(meeting.id, { ata: { ...ata, items: ata.items.map((i) => (i.id === item.id ? item : i)) } });
  }

  async function approve(reviewer: string) {
    if (!ata) return;
    const fresh = buildRegistry(getMf().meetings, meeting.projectId, meeting.id);
    const numbered = numberAta(ata.items, ata.subsections, fresh, meeting.ar, meeting.date);
    await patchMeeting(meeting.id, {
      ata: { ...ata, items: numbered.items, subsections: numbered.subsections },
      status: "approved",
      approvedBy: reviewer,
      approvedAt: new Date().toISOString(),
    });
    setApproving(false);
  }

  function exportXlsx() {
    if (!ata) return;
    const title = `${arCode(meeting.ar)} · ${pick(ata.title, "pt").toUpperCase()}`;
    download(`${project.on}-AR-G-${String(meeting.ar).padStart(3, "0")}-RG.xlsx`, registryWorkbook(project, title, ata.items, subsections));
  }

  const header = (
    <div className="flex flex-col gap-5 border-b border-mf-300 pb-6">
      <Link href="/mf/atas" className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium text-mf-700 hover:text-white">
        <ArrowLeft className="size-3.5" />
        {c.nav.atas}
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="mf-num rounded-md bg-white px-2 py-0.5 text-[13px] font-medium text-black">{arCode(meeting.ar)}</span>
            <MeetingStatusTag status={meeting.status} />
            {project.demo && <Tag>{c.demo}</Tag>}
          </div>
          <h1 className="mt-3 text-[26px] font-semibold leading-tight text-white md:text-[32px]">
            {ata ? pick(ata.title, lang) : meeting.title || (meeting.status === "processing" ? tr("Gerando a ata…", "Generating the minutes…") : c.form.title)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-mf-700">
            <span className="mf-num">ON {project.on}</span>
            <span>·</span>
            <span>{project.name}</span>
            <span>·</span>
            <span>{longDate(meeting.date, lang)}</span>
            {meeting.startTime && (
              <>
                <span>·</span>
                <span className="mf-num">
                  {meeting.startTime}
                  {meeting.endTime && ` - ${meeting.endTime}`}
                </span>
              </>
            )}
            <span>·</span>
            <span>{durationLabel(meetingDuration(meeting))}</span>
          </div>
        </div>
        {ata && meeting.status !== "processing" && (
          <div className="flex flex-wrap items-center gap-2">
            <MoreMenu
              items={[
                ...(approved
                  ? [{ icon: Undo2, label: c.ws.reopen, disabled: laterApproved, action: () => patchMeeting(meeting.id, { status: "draft", approvedBy: "", approvedAt: "" }) }]
                  : [{ icon: RefreshCw, label: c.ws.regenerate, action: () => setConfirm("regenerate") }]),
                { icon: Trash, label: c.delete, danger: true, action: () => setConfirm("delete") },
              ]}
            />
            <ExportMenu meeting={meeting} onXlsx={exportXlsx} view={view} />
            {!approved && (
              <Button variant="primary" icon={<Check className="size-4" />} onClick={() => setApproving(true)}>
                {c.ws.approve}
              </Button>
            )}
          </div>
        )}
      </div>
      {ata && meeting.status === "draft" && (
        <div className="flex flex-col gap-4 rounded-2xl border border-mf-warn/30 bg-mf-warn/[0.06] p-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mf-warn/15 text-mf-warn">
              <PenLine className="size-4" />
            </span>
            <div>
              <div className="text-[15px] font-semibold text-white">{tr("Rascunho pronto", "Draft ready")}</div>
              <div className="text-[13px] text-mf-700">{tr("Revise antes de aprovar.", "Review before approving.")}</div>
            </div>
          </div>
          <ol className="grid flex-1 gap-2 sm:grid-cols-3">
            {[
              { label: tr("Leia os itens e clique para corrigir", "Read the items and click to correct"), action: () => setTab("ata") },
              { label: tr("Confira quem falou na aba Falantes", "Check who spoke in the Speakers tab"), action: () => setTab("speakers") },
              { label: tr("Aprove para entrar no Registro Geral", "Approve to enter the General Register"), action: () => setApproving(true) },
            ].map((step, index) => (
              <li key={step.label}>
                <button type="button" onClick={step.action} className="flex w-full items-center gap-3 rounded-lg border border-mf-400 bg-black/40 px-3.5 py-2.5 text-left text-[13.5px] text-mf-900 transition-colors hover:border-mf-600 hover:text-white">
                  <span className="mf-num flex size-6 shrink-0 items-center justify-center rounded-full border border-mf-500 text-[11.5px] text-white">{index + 1}</span>
                  {step.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      {ata && approved && (
        <div className="flex flex-col gap-4 rounded-2xl border border-mf-ok/30 bg-mf-ok/[0.06] p-5 sm:flex-row sm:items-center">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mf-ok/15 text-mf-ok">
            <Lock className="size-4" />
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-white">
              {tr("Ata aprovada", "Minutes approved")} · {meeting.approvedBy}
            </div>
            <div className="text-[13px] text-mf-700">{tr("Os itens já estão no Registro Geral do projeto. Baixe o PDF para enviar aos participantes.", "The items are in the project's General Register. Download the PDF to send to participants.")}</div>
          </div>
          <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.open(`/mf/atas/${meeting.id}/imprimir?view=${view}&auto=1`, "_blank")}>
            {tr("Baixar PDF", "Download PDF")}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Page wide>
      {header}

      {meeting.status === "processing" && <ProcessingView meeting={meeting} job={job} />}
      {meeting.status === "failed" && <FailedView meeting={meeting} onDelete={() => setConfirm("delete")} />}

      {ata && meeting.status !== "processing" && meeting.status !== "failed" && (
        <>
          <div className="mf-scroll sticky top-14 z-20 -mx-4 mt-2 flex gap-1 overflow-x-auto border-b border-mf-300 bg-mf-50/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
            {(
              [
                { key: "ata", icon: FileText, count: ata.items.length },
                { key: "transcript", icon: AudioLines, count: meeting.segments.length },
                { key: "speakers", icon: Users, count: meeting.speakers.length },
                { key: "actions", icon: ListChecks, count: ata.items.filter((i) => i.isAction || i.status === "progress").length },
              ] as const
            ).map(({ key, icon: Icon, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-current={tab === key ? "page" : undefined}
                className={cx(
                  "relative inline-flex h-13 shrink-0 items-center gap-2 px-3.5 text-[14px] font-semibold transition-colors",
                  tab === key ? "text-white" : "text-mf-600 hover:text-mf-900",
                )}
              >
                <Icon className="size-4" />
                {c.ws.tabs[key]}
                <span className={cx("mf-num rounded px-1.5 text-[11px]", tab === key ? "bg-white text-black" : "bg-mf-300 text-mf-700")}>{count}</span>
                {tab === key && <span className="absolute inset-x-3 bottom-0 h-[2px] bg-white" />}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {tab === "ata" && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Segmented size="sm" value={view} onChange={setView} options={[{ value: "both", label: c.ws.both }, { value: "pt", label: "PT" }, { value: "en", label: "EN" }]} />
                      {!approved && (
                        <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setEditingMeta(true)}>
                          {c.form.details}
                        </Button>
                      )}
                    </div>
                    {!approved && <span className="text-[11.5px] text-mf-600">{c.ws.editHint}</span>}
                  </div>
                  <div className="mf-scroll overflow-x-auto rounded-xl bg-mf-150 p-3 sm:p-6">
                    <div className="min-w-[780px]">
                      <AtaDocument meeting={meeting} project={project} ata={ata} subsections={subsections} view={view} onEditItem={(item) => setEditing({ item, isNew: false })} />
                    </div>
                  </div>
                  {!approved && (
                    <Button className="mt-4" icon={<Plus className="size-4" />} onClick={() => setEditing({ item: blankItem(meeting), isNew: true })}>
                      {c.ws.addItem}
                    </Button>
                  )}
                </div>
                <ReviewRail meeting={meeting} onApprove={() => setApproving(true)} />
              </div>
            )}
            {tab === "transcript" && <TranscriptPanel meeting={meeting} focus={focus} />}
            {tab === "speakers" && <SpeakersPanel key={meeting.updatedAt} meeting={meeting} onRegenerate={() => runPipeline(meeting.id, "draft")} />}
            {tab === "actions" && <ActionPlanPanel meeting={meeting} readOnly={approved} onUpdate={updateAction} />}
          </div>
        </>
      )}

      {editing && (
        <ItemDrawer
          key={editing.item.id}
          item={editing.item}
          isNew={editing.isNew}
          subsections={subsections}
          participants={meeting.participants}
          readOnly={approved}
          onClose={() => setEditing(null)}
          onSave={saveItem}
          onRemove={() => removeItem(editing.item)}
          onJump={jump}
        />
      )}
      {editingMeta && <MetaDrawer meeting={meeting} onClose={() => setEditingMeta(false)} />}
      {approving && <ApproveModal meeting={meeting} onClose={() => setApproving(false)} onApprove={approve} />}
      {confirm && (
        <Modal
          title={confirm === "delete" ? c.delete : c.ws.regenerate}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                {c.cancel}
              </Button>
              <Button
                variant={confirm === "delete" ? "danger" : "primary"}
                onClick={async () => {
                  if (confirm === "delete") {
                    await deleteMeeting(meeting.id);
                    router.push("/mf/atas");
                  } else {
                    setConfirm(null);
                    setTab("ata");
                    runPipeline(meeting.id, "draft");
                  }
                }}
              >
                {confirm === "delete" ? c.delete : c.ws.regenerate}
              </Button>
            </>
          }
        >
          <p className="text-[13.5px] leading-relaxed text-mf-800">{confirm === "delete" ? c.ws.deleteConfirm : c.ws.regenerateLead}</p>
        </Modal>
      )}
    </Page>
  );
}

function MoreMenu({ items }: { items: { icon: LucideIcon; label: string; action: () => void; danger?: boolean; disabled?: boolean }[] }) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="ghost" icon={<Ellipsis className="size-4" />} onClick={() => setOpen(!open)} aria-label={tr("Mais ações", "More actions")} aria-expanded={open} />
      {open && (
        <>
          <button type="button" aria-label={tr("Fechar", "Close")} className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="mf-rise absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-mf-400 bg-mf-150 py-1 shadow-2xl">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.action();
                }}
                className={cx(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13.5px] hover:bg-mf-300 disabled:opacity-40",
                  item.danger ? "text-mf-rec" : "text-mf-900 hover:text-white",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ExportMenu({ meeting, onXlsx, view }: { meeting: Meeting; onXlsx: () => void; view: DocView }) {
  const { c } = useCopy();
  const [open, setOpen] = useState(false);
  const options = [
    { icon: Printer, label: c.ws.pdf, action: () => window.open(`/mf/atas/${meeting.id}/imprimir?view=${view}&auto=1`, "_blank") },
    { icon: FileSpreadsheet, label: c.ws.xlsx, action: onXlsx },
    {
      icon: FileText,
      label: c.ws.txt,
      action: () => download(transcriptFileName(meeting), new Blob([transcriptText(meeting)], { type: "text/plain;charset=utf-8" })),
    },
  ];
  return (
    <div className="relative">
      <Button icon={<Download className="size-4" />} onClick={() => setOpen(!open)}>
        {c.ws.export}
        <ChevronDown className="size-3.5" />
      </Button>
      {open && (
        <>
          <button type="button" aria-label={c.close} className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="mf-rise absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-lg border border-mf-400 bg-mf-150 py-1 shadow-2xl">
            {options.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  option.action();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-mf-900 hover:bg-mf-300 hover:text-white"
              >
                <option.icon className="size-4 text-mf-700" />
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewRail({ meeting, onApprove }: { meeting: Meeting; onApprove: () => void }) {
  const { c, lang } = useCopy();
  const ata = meeting.ata!;
  const stats = [
    { label: c.ws.stats.items, value: ata.items.length },
    { label: c.ws.stats.decisions, value: ata.items.filter((i) => i.isDecision).length },
    { label: c.ws.stats.actions, value: ata.items.filter((i) => i.isAction || i.status === "progress").length },
    { label: c.ws.stats.carried, value: ata.items.filter((i) => i.updates).length },
  ];
  const sections = [...new Set(ata.items.map((i) => i.section))].sort((a, b) => a - b);

  return (
    <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start">
      <Card>
        <div className="grid grid-cols-2">
          {stats.map((stat, index) => (
            <div key={stat.label} className={cx("px-5 py-4", index % 2 === 0 && "border-r border-mf-300", index < 2 && "border-b border-mf-300")}>
              <div className="mf-num text-[26px] font-medium leading-none text-white">{stat.value}</div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.1em] text-mf-600">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-mf-300 px-5 py-4">
          {sections.map((n) => (
            <span key={n} className="rounded border border-mf-400 px-1.5 py-0.5 text-[10.5px] text-mf-800">
              <span className="mf-num mr-1 text-mf-600">{n}</span>
              {sectionOf(n)[lang]}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 border-b border-mf-300 px-5 py-3.5">
          <TriangleAlert className={cx("size-4", ata.reviewFlags.length ? "text-mf-warn" : "text-mf-600")} />
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">{c.ws.flags}</h3>
          <span className="mf-num ml-auto text-[12px] text-mf-600">{ata.reviewFlags.length}</span>
        </div>
        <div className="px-5 py-4">
          {ata.reviewFlags.length ? (
            <ul className="flex flex-col gap-3">
              {ata.reviewFlags.map((flag, index) => (
                <li key={index} className="flex gap-2.5 text-[12.5px] leading-relaxed text-mf-900">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-mf-warn" />
                  {pick(flag, lang)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-mf-700">{c.ws.noFlags}</p>
          )}
        </div>
      </Card>

      <Card className="px-5 py-4">
        {meeting.status === "approved" ? (
          <div className="flex items-start gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-mf-ok/15 text-mf-ok">
              <Lock className="size-4" />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-white">
                {c.ws.approvedBy} {meeting.approvedBy}
              </div>
              <div className="mt-0.5 text-[12px] text-mf-700">{longDate(meeting.approvedAt.slice(0, 10), lang)}</div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[12.5px] leading-relaxed text-mf-700">{c.ws.approveLead}</p>
            <Button variant="primary" className="mt-4 w-full" icon={<Check className="size-4" />} onClick={onApprove}>
              {c.ws.approve}
            </Button>
          </>
        )}
        <div className="mt-4 border-t border-mf-300 pt-3 text-[11px] text-mf-600">
          {c.ws.generatedBy} <span className="mf-num">{ata.model}</span>
        </div>
      </Card>
    </aside>
  );
}

function ApproveModal({ meeting, onClose, onApprove }: { meeting: Meeting; onClose: () => void; onApprove: (reviewer: string) => Promise<void> }) {
  const { c } = useCopy();
  const [reviewer, setReviewer] = useState(meeting.secretary);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      title={`${c.ws.approve} ${arCode(meeting.ar)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button
            variant="primary"
            icon={<Check className="size-4" />}
            disabled={!reviewer.trim() || !checked}
            loading={saving}
            onClick={async () => {
              setSaving(true);
              await onApprove(reviewer.trim());
            }}
          >
            {c.ws.approve}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-mf-700">{c.ws.approveLead}</p>
      <Field label={c.ws.reviewer} className="mt-5">
        <Input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Nome / Name" autoFocus />
      </Field>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[13px] text-mf-900">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 size-4 accent-white" />
        {c.ws.confirm}
      </label>
    </Modal>
  );
}

const STAGES = ["preparing", "transcribing", "drafting"] as const;

function ProcessingView({ meeting, job }: { meeting: Meeting; job: JobView | null }) {
  const { c } = useCopy();
  const tr = useTr();
  const [now, setNow] = useState(() => Date.now());
  const feed = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [job?.liveSegments.length, job?.liveItems.length]);

  const stage = job?.stage ?? "preparing";
  const imported = meeting.source.kind === "transcript";
  const steps = [
    { key: "preparing", label: c.job.preparing },
    { key: "transcribing", label: c.job.transcribing },
    { key: "drafting", label: c.job.drafting },
  ].filter((step) => !imported || step.key === "drafting");
  const stageIndex = STAGES.indexOf(stage);
  const determinate = stage !== "drafting";
  const percent =
    stage === "preparing" ? (job?.progress ?? 0) * 100 : stage === "transcribing" && job ? ((job.chunk - 1) / Math.max(1, job.chunks)) * 100 + 100 / Math.max(1, job.chunks) / 2 : 0;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit p-6">
        <div className="flex items-center justify-between">
          <span className="mf-eyebrow text-mf-700">{c.job.elapsed}</span>
          <span className="mf-num text-[13px] text-white">{clock(job ? (now - job.startedAt) / 1000 : 0)}</span>
        </div>
        <ol className="mt-6 flex flex-col gap-5">
          {steps.map((step) => {
            const index = STAGES.indexOf(step.key as (typeof STAGES)[number]);
            const state = index < stageIndex ? "done" : index === stageIndex ? "active" : "waiting";
            return (
              <li key={step.key} className="flex items-start gap-3.5">
                <span
                  className={cx(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                    state === "done" && "border-white bg-white text-black",
                    state === "active" && "border-white text-white",
                    state === "waiting" && "border-mf-400 text-mf-600",
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" /> : state === "active" ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                </span>
                <div className="flex-1">
                  <div className={cx("text-[13.5px] font-semibold", state === "waiting" ? "text-mf-600" : "text-white")}>{step.label}</div>
                  {state === "active" && step.key === "transcribing" && job && job.chunks > 1 && (
                    <div className="mf-num mt-1 text-[11.5px] text-mf-700">
                      {c.job.part} {job.chunk} {c.job.of} {job.chunks}
                    </div>
                  )}
                  {state === "active" && (
                    <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-mf-300">
                      {determinate ? (
                        <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${Math.max(4, percent)}%` }} />
                      ) : (
                        <div className="mf-indeterminate absolute inset-0" />
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-7 border-t border-mf-300 pt-4 text-[13px] leading-relaxed text-mf-700">
          {tr("Normalmente leva de 1 a 3 minutos, conforme a duração da reunião.", "Usually takes 1 to 3 minutes, depending on the meeting length.")}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-mf-600">{c.job.roam}</p>
      </Card>

      <Card className="flex min-h-[420px] flex-col overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-mf-300 px-5 py-3.5">
          <span className="size-2 rounded-full bg-mf-rec mf-blink" />
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">
            {stage === "drafting" ? c.job.liveItems : c.job.liveTranscript}
          </h2>
          {stage === "drafting" && job && <span className="mf-num ml-auto text-[12px] text-mf-700">{job.liveItems.length}</span>}
        </div>
        <div ref={feed} className="mf-scroll max-h-[560px] flex-1 overflow-y-auto px-5 py-4">
          {stage !== "drafting" &&
            (job?.liveSegments.length ? (
              <div className="flex flex-col gap-3">
                {job.liveSegments.map((segment, index) => (
                  <div key={index} className="mf-rise flex gap-3 text-[13.5px] leading-relaxed">
                    <span className="mf-num w-12 shrink-0 pt-0.5 text-[11px] text-mf-600">{segment.start}</span>
                    <div>
                      <span className="mr-2 font-semibold text-white">{segment.speaker}</span>
                      <span className="text-mf-900">{segment.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Waiting text={c.job.waiting} />
            ))}
          {stage === "drafting" &&
            (job?.liveItems.length ? (
              <div className="flex flex-col gap-2.5">
                {job.liveItems.map((item, index) => (
                  <div key={index} className="mf-rise flex gap-3 rounded-lg border border-mf-300 bg-mf-50 px-4 py-3 text-[13px] leading-relaxed">
                    <span className="mf-num shrink-0 text-[11px] text-mf-600">{String(item.section).padStart(2, "0")}</span>
                    <div>
                      <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-mf-600">{sectionOf(item.section).pt}</div>
                      <div className="text-mf-950">{item.pt}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Waiting text={c.job.thinking} />
            ))}
        </div>
      </Card>
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-8 items-end gap-1">
        {[0, 1, 2, 3, 4].map((bar) => (
          <span key={bar} className="w-1 animate-pulse rounded-full bg-white" style={{ height: 10 + ((bar * 7) % 20), animationDelay: `${bar * 140}ms` }} />
        ))}
      </div>
      <p className="text-[13px] text-mf-700">{text}</p>
    </div>
  );
}

function FailedView({ meeting, onDelete }: { meeting: Meeting; onDelete: () => void }) {
  const { c } = useCopy();
  const message =
    meeting.error === "interrupted"
      ? c.job.interrupted
      : meeting.error === "audio-missing"
        ? c.job.audioMissing
        : meeting.error === "file-too-large"
          ? c.job.tooLarge
          : meeting.error;
  const canRetry = meeting.error !== "audio-missing" || meeting.segments.length > 0;
  return (
    <Card className="mt-8 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mf-rec/10 text-mf-rec">
        <CircleAlert className="size-5" />
      </span>
      <div className="flex-1">
        <div className="text-[15px] font-semibold text-white">{c.job.failed}</div>
        <p className="mt-1 break-words text-[13px] text-mf-700">{message}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" icon={<Trash className="size-4" />} onClick={onDelete}>
          {c.delete}
        </Button>
        {canRetry && (
          <Button variant="primary" icon={<RefreshCw className="size-4" />} onClick={() => runPipeline(meeting.id, meeting.segments.length ? "draft" : "transcribe")}>
            {c.job.retry}
          </Button>
        )}
      </div>
    </Card>
  );
}
