"use client";

import { ArrowRight, Check, ChevronDown, FileText, Mic, Plus, Sparkles, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useCopy, useTr } from "@/lib/mf/copy";
import { arCode, clockNow, longDate, todayIso, uid } from "@/lib/mf/format";
import { runPipeline } from "@/lib/mf/pipeline";
import { putAudio, saveMeeting, useMf } from "@/lib/mf/store";
import type { Meeting, Modality, Participant, Project, SourceKind } from "@/lib/mf/types";
import { ProjectModal } from "./ProjectModal";
import { Recorder, type Recording } from "./Recorder";
import { AudioUpload, TranscriptUpload, type AudioFile, type TranscriptInput } from "./SourceInputs";
import { Button, cx, Field, Input, LoadingPage, Page, Segmented, Textarea } from "./ui";

const blankParticipant = (): Participant => ({ id: uid(), name: "", company: "", role: "", present: true });

const MODES: Record<string, SourceKind> = { gravar: "recording", arquivo: "audio", texto: "transcript" };

export function NewAta({ initialProject, initialMode }: { initialProject?: string; initialMode?: string }) {
  const mf = useMf();
  if (!mf.ready) return <LoadingPage />;
  return <NewAtaForm projects={mf.projects} meetings={mf.meetings} initialProject={initialProject} initialMode={initialMode ? MODES[initialMode] : undefined} />;
}

function Step({ n, title, lead, done, children }: { n: number; title: string; lead?: string; done: boolean; children: ReactNode }) {
  return (
    <section className="relative rounded-none border border-mf-300 bg-mf-100 p-5 sm:p-7">
      <header className="flex items-start gap-4">
        <span
          className={cx(
            "mf-num flex h-9 w-11 shrink-0 items-center justify-center border text-[13px] font-medium transition-colors",
            done ? "border-white bg-white text-black" : "border-mf-500 text-white",
          )}
        >
          {done ? <Check className="size-4" strokeWidth={2.5} /> : String(n).padStart(2, "0")}
        </span>
        <div className="pt-0.5">
          <h2 className="text-[18px] font-semibold leading-snug text-white">{title}</h2>
          {lead && <p className="mt-1 text-[14px] leading-relaxed text-mf-700">{lead}</p>}
        </div>
      </header>
      <div className="mt-6 sm:pl-15">{children}</div>
    </section>
  );
}

function NewAtaForm({
  projects,
  meetings,
  initialProject,
  initialMode,
}: {
  projects: Project[];
  meetings: Meeting[];
  initialProject?: string;
  initialMode?: SourceKind;
}) {
  const { c, lang } = useCopy();
  const tr = useTr();
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects.find((p) => p.id === initialProject)?.id ?? (projects.length === 1 ? projects[0].id : ""));
  const [creatingProject, setCreatingProject] = useState(false);
  const [kind, setKind] = useState<SourceKind | null>(initialMode ?? null);
  const [showDetails, setShowDetails] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso);
  const [startTime, setStartTime] = useState(clockNow);
  const [startTouched, setStartTouched] = useState(false);
  const [modality, setModality] = useState<Modality>("teams");
  const [location, setLocation] = useState("");
  const [secretary, setSecretary] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([blankParticipant()]);
  const [agenda, setAgenda] = useState("");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [transcript, setTranscript] = useState<TranscriptInput>({ text: "", name: "", parsed: null });
  const [submitting, setSubmitting] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const projectMeetings = meetings.filter((m) => m.projectId === projectId);
  const nextAr = Math.max(0, ...projectMeetings.map((m) => m.ar)) + 1;

  const suggestions = useMemo(() => {
    const seen = new Map<string, Participant>();
    for (const meeting of projectMeetings) {
      for (const person of meeting.participants) {
        if (person.name && !seen.has(person.name.toLowerCase())) seen.set(person.name.toLowerCase(), person);
      }
    }
    return [...seen.values()];
  }, [projectMeetings]);

  const sourceReady = Boolean(
    (kind === "recording" && recording) || (kind === "audio" && audioFile) || (kind === "transcript" && transcript.parsed),
  );
  const ready = Boolean(project) && sourceReady;

  const modes = [
    { value: "recording" as const, icon: Mic, title: tr("Gravar agora", "Record now"), text: tr("Grave pelo computador durante a reunião, presencial ou no Teams.", "Record from this computer during the meeting, in person or on Teams.") },
    { value: "audio" as const, icon: Upload, title: tr("Enviar gravação", "Upload a recording"), text: tr("Áudio ou vídeo do Teams, do celular ou de um gravador.", "Audio or video from Teams, a phone or a recorder.") },
    { value: "transcript" as const, icon: FileText, title: tr("Colar transcrição", "Paste a transcript"), text: tr("Texto pronto do Teams, Zoom ou Meet.", "Ready-made text from Teams, Zoom or Meet.") },
  ];

  function addSuggestion(person: Participant) {
    setParticipants((current) => {
      if (current.some((p) => p.name.toLowerCase() === person.name.toLowerCase())) return current;
      return [...current.filter((p) => p.name.trim()), { ...person, id: uid(), present: true }];
    });
  }

  function updateParticipant(id: string, patch: Partial<Participant>) {
    setParticipants((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function onRecording(value: Recording | null) {
    setRecording(value);
    if (value && !startTouched) {
      setStartTime(`${String(value.startedAt.getHours()).padStart(2, "0")}:${String(value.startedAt.getMinutes()).padStart(2, "0")}`);
    }
  }

  async function submit() {
    if (!project || !kind || !sourceReady || submitting) return;
    setSubmitting(true);
    const id = uid();
    const now = new Date().toISOString();
    const audio = kind === "recording" ? recording?.blob : kind === "audio" ? audioFile?.file : undefined;
    const parsed = kind === "transcript" ? transcript.parsed : null;
    const lastStart = parsed?.segments.at(-1)?.start ?? 0;

    const meeting: Meeting = {
      id,
      projectId: project.id,
      ar: nextAr,
      title: title.trim(),
      date,
      startTime,
      endTime: "",
      modality,
      location: location.trim(),
      secretary: secretary.trim(),
      participants: participants.filter((p) => p.name.trim()).map((p) => ({ ...p, name: p.name.trim() })),
      agenda: agenda.split("\n").map((line) => line.trim()).filter(Boolean),
      source: {
        kind,
        name: kind === "recording" ? "" : kind === "audio" ? (audioFile?.file.name ?? "") : transcript.name,
        duration: kind === "recording" ? (recording?.duration ?? 0) : kind === "audio" ? (audioFile?.duration ?? 0) : lastStart ? lastStart + 20 : 0,
        size: audio?.size ?? transcript.text.length,
      },
      hasAudio: Boolean(audio),
      speakers: parsed?.speakers ?? [],
      segments: parsed?.segments ?? [],
      ata: null,
      status: "processing",
      error: "",
      failedStage: "",
      approvedBy: "",
      approvedAt: "",
      createdAt: now,
      updatedAt: now,
    };
    if (audio) await putAudio(id, audio);
    await saveMeeting(meeting);
    void runPipeline(id, parsed ? "draft" : "transcribe");
    router.push(`/mf/atas/${id}`);
  }

  const checklist = [
    { done: Boolean(project), label: tr("Projeto", "Project") },
    { done: sourceReady, label: tr("Reunião", "Meeting") },
  ];

  return (
    <Page>
      <div className="mx-auto max-w-[920px]">
        <header className="mb-8">
          <div className="mf-eyebrow text-mf-600">{project ? `ON ${project.on} · ${c.form.nextAr} ${arCode(nextAr)}` : c.nav.atas}</div>
          <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.01em] text-white md:text-[36px]">{c.form.title}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mf-700">
            {tr(
              "Três passos simples. A inteligência artificial escreve a ata no modelo da MF e você revisa tudo antes de aprovar.",
              "Three simple steps. The AI writes the minutes in MF's format and you review everything before approving.",
            )}
          </p>
        </header>

        <div className="flex flex-col gap-5 pb-32">
          <Step n={1} done={Boolean(project)} title={tr("Para qual projeto é a ata?", "Which project are these minutes for?")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((p) => {
                const selected = p.id === projectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProjectId(p.id)}
                    aria-pressed={selected}
                    className={cx(
                      "relative flex items-center gap-4 rounded-none border p-4 text-left transition-colors",
                      selected ? "border-white bg-mf-200" : "border-mf-400 bg-mf-50 hover:border-mf-600",
                    )}
                  >
                    <span className={cx("mf-num flex h-12 min-w-14 items-center justify-center rounded-none px-2 text-[17px] font-medium", selected ? "bg-white text-black" : "bg-mf-200 text-white")}>
                      {p.on}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-white">{p.name}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-mf-700">
                        {p.client} · {p.city}
                      </span>
                    </span>
                    {selected && <Check className="size-5 shrink-0 text-white" strokeWidth={2.5} />}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCreatingProject(true)}
                className="flex min-h-20 items-center justify-center gap-2 rounded-none border border-dashed border-mf-500 text-[14px] font-semibold text-mf-800 transition-colors hover:border-white hover:text-white"
              >
                <Plus className="size-4" />
                {c.form.newProject}
              </button>
            </div>
          </Step>

          <Step
            n={2}
            done={sourceReady}
            title={tr("Como a reunião vai chegar?", "How will the meeting come in?")}
            lead={tr("Escolha uma opção. Você pode trocar a qualquer momento.", "Pick one option. You can switch at any time.")}
          >
            <div className="grid gap-3 md:grid-cols-3">
              {modes.map((mode) => {
                const selected = kind === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setKind(mode.value)}
                    aria-pressed={selected}
                    className={cx(
                      "group flex flex-col items-start rounded-none border p-5 text-left transition-colors",
                      selected ? "border-white bg-white text-black" : "border-mf-400 bg-mf-50 text-white hover:border-mf-600",
                    )}
                  >
                    <span className={cx("flex size-11 items-center justify-center rounded-none", selected ? "bg-black text-white" : "bg-mf-200 text-white")}>
                      <mode.icon className="size-5" />
                    </span>
                    <span className="mt-4 text-[16px] font-semibold">{mode.title}</span>
                    <span className={cx("mt-1 text-[13.5px] leading-snug", selected ? "text-black/70" : "text-mf-700")}>{mode.text}</span>
                  </button>
                );
              })}
            </div>

            <div className={cx("mt-6", kind !== "recording" && "hidden")}>
              <Recorder onChange={onRecording} />
            </div>
            {kind === "audio" && (
              <div className="mt-6">
                <AudioUpload value={audioFile} onChange={setAudioFile} />
              </div>
            )}
            {kind === "transcript" && (
              <div className="mt-6">
                <TranscriptUpload value={transcript} onChange={setTranscript} />
              </div>
            )}
          </Step>

          <Step
            n={3}
            done={false}
            title={tr("Detalhes da reunião", "Meeting details")}
            lead={tr("Opcional. O que ficar em branco a IA tenta preencher pela conversa.", "Optional. Anything left blank, the AI tries to fill in from the conversation.")}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-none border border-mf-400 bg-mf-50 px-4 py-3 text-[14px] text-mf-800">
              <span>{longDate(date, lang)}</span>
              <span className="text-mf-600">·</span>
              <span className="mf-num">{startTime}</span>
              <span className="text-mf-600">·</span>
              <span>{c.modality[modality]}</span>
              {participants.some((p) => p.name.trim()) && (
                <>
                  <span className="text-mf-600">·</span>
                  <span>
                    {participants.filter((p) => p.name.trim()).length} {tr("participantes", "participants")}
                  </span>
                </>
              )}
              <button type="button" onClick={() => setShowDetails((v) => !v)} className="ml-auto inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white hover:underline">
                {showDetails ? tr("Ocultar detalhes", "Hide details") : tr("Adicionar detalhes", "Add details")}
                <ChevronDown className={cx("size-4 transition-transform", showDetails && "rotate-180")} />
              </button>
            </div>

            {showDetails && (
              <div className="mf-rise mt-5 flex flex-col gap-5">
                <Field label={c.form.meetingTitle}>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={c.form.meetingTitlePlaceholder} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={c.form.date}>
                    <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mf-num [color-scheme:dark]" />
                  </Field>
                  <Field label={c.form.start}>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(event) => {
                        setStartTouched(true);
                        setStartTime(event.target.value);
                      }}
                      className="mf-num [color-scheme:dark]"
                    />
                  </Field>
                  <Field label={c.form.modality}>
                    <Segmented value={modality} onChange={setModality} options={(["teams", "presencial", "hibrida"] as const).map((value) => ({ value, label: c.modality[value].replace("Microsoft ", "") }))} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={c.form.location}>
                    <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={c.form.locationPlaceholder} />
                  </Field>
                  <Field label={c.form.secretary}>
                    <Input value={secretary} onChange={(event) => setSecretary(event.target.value)} placeholder={tr("Seu nome", "Your name")} />
                  </Field>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div>
                    <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-mf-700">{c.form.participants}</span>
                    <p className="mt-1 text-[13px] text-mf-600">{c.form.participantsLead}</p>
                  </div>
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((person) => {
                        const added = participants.some((p) => p.name.toLowerCase() === person.name.toLowerCase());
                        return (
                          <button
                            key={person.name}
                            type="button"
                            disabled={added}
                            onClick={() => addSuggestion(person)}
                            className={cx(
                              "inline-flex h-9 items-center gap-1.5 rounded-none border px-3 text-[13px] transition-colors",
                              added ? "border-mf-300 bg-mf-200 text-mf-600" : "border-mf-500 text-mf-900 hover:border-white hover:text-white",
                            )}
                          >
                            {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                            {person.name}
                            <span className="text-mf-600">{person.company}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {participants.map((person) => (
                    <div key={person.id} className="grid grid-cols-[1.4fr_1fr_auto] gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                      <Input value={person.name} onChange={(e) => updateParticipant(person.id, { name: e.target.value })} placeholder={c.form.name} aria-label={c.form.name} />
                      <Input value={person.company} onChange={(e) => updateParticipant(person.id, { company: e.target.value })} placeholder={c.form.company} aria-label={c.form.company} />
                      <Input value={person.role} onChange={(e) => updateParticipant(person.id, { role: e.target.value })} placeholder={c.form.role} aria-label={c.form.role} className="hidden sm:block" />
                      <button
                        type="button"
                        aria-label={c.delete}
                        onClick={() => setParticipants((current) => (current.length > 1 ? current.filter((p) => p.id !== person.id) : [blankParticipant()]))}
                        className="flex size-10 items-center justify-center rounded-none text-mf-600 hover:bg-mf-200 hover:text-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" className="self-start" icon={<Plus className="size-3.5" />} onClick={() => setParticipants((current) => [...current, blankParticipant()])}>
                    {c.form.addParticipant}
                  </Button>
                </div>

                <Field label={c.form.agenda} hint={c.optional}>
                  <Textarea value={agenda} onChange={(event) => setAgenda(event.target.value)} placeholder={c.form.agendaPlaceholder} className="min-h-20" />
                </Field>
              </div>
            )}
          </Step>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-mf-300 bg-black/90 backdrop-blur lg:left-[264px]">
        <div className="mx-auto flex max-w-[920px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            {checklist.map((item) => (
              <span key={item.label} className={cx("inline-flex items-center gap-2 text-[13.5px] font-medium", item.done ? "text-white" : "text-mf-600")}>
                <span className={cx("flex size-5 items-center justify-center rounded-none border", item.done ? "border-white bg-white text-black" : "border-mf-500")}>
                  {item.done && <Check className="size-3" strokeWidth={3} />}
                </span>
                {item.label}
              </span>
            ))}
            <span className="hidden text-[13px] text-mf-600 md:inline">
              {ready ? tr("Leva cerca de 1 minuto. Você revisa antes de aprovar.", "Takes about a minute. You review before approving.") : !project ? c.form.needProject : c.form.needSource}
            </span>
          </div>
          <Button variant="primary" size="lg" disabled={!ready} loading={submitting} onClick={submit} icon={submitting ? undefined : <Sparkles className="size-4" />} className="sm:min-w-56">
            {c.form.generate}
            {!submitting && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </div>

      {creatingProject && (
        <ProjectModal
          onClose={() => setCreatingProject(false)}
          onCreated={(created) => {
            setProjectId(created.id);
            setCreatingProject(false);
          }}
        />
      )}
    </Page>
  );
}
