"use client";

import { ArrowRight, FileText, Mic, Plus, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCopy } from "@/lib/mf/copy";
import { arCode, clockNow, todayIso, uid } from "@/lib/mf/format";
import { runPipeline } from "@/lib/mf/pipeline";
import { putAudio, saveMeeting, useMf } from "@/lib/mf/store";
import type { Meeting, Modality, Participant, Project, SourceKind } from "@/lib/mf/types";
import { ProjectModal } from "./ProjectModal";
import { Recorder, type Recording } from "./Recorder";
import { AudioUpload, TranscriptUpload, type AudioFile, type TranscriptInput } from "./SourceInputs";
import { Button, Card, cx, Field, Input, LoadingPage, Page, PageHeader, Segmented, Select, Textarea } from "./ui";

const blankParticipant = (): Participant => ({ id: uid(), name: "", company: "", role: "", present: true });

export function NewAta({ initialProject }: { initialProject?: string }) {
  const mf = useMf();
  if (!mf.ready) return <LoadingPage />;
  return <NewAtaForm projects={mf.projects} meetings={mf.meetings} initialProject={initialProject} />;
}

function NewAtaForm({ projects, meetings, initialProject }: { projects: Project[]; meetings: Meeting[]; initialProject?: string }) {
  const { c, lang } = useCopy();
  const router = useRouter();
  const [projectId, setProjectId] = useState(
    projects.find((p) => p.id === initialProject)?.id ?? projects.find((p) => !p.demo)?.id ?? projects[0]?.id ?? "",
  );
  const [creatingProject, setCreatingProject] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso);
  const [startTime, setStartTime] = useState(clockNow);
  const [startTouched, setStartTouched] = useState(false);
  const [modality, setModality] = useState<Modality>("teams");
  const [location, setLocation] = useState("");
  const [secretary, setSecretary] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([blankParticipant()]);
  const [agenda, setAgenda] = useState("");
  const [kind, setKind] = useState<SourceKind>("recording");
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

  const ready =
    (kind === "recording" && recording) ||
    (kind === "audio" && audioFile) ||
    (kind === "transcript" && transcript.parsed);
  const blocker = !project ? c.form.needProject : !ready ? c.form.needSource : "";

  function addSuggestion(person: Participant) {
    setParticipants((current) => {
      if (current.some((p) => p.name.toLowerCase() === person.name.toLowerCase())) return current;
      const filled = current.filter((p) => p.name.trim());
      return [...filled, { ...person, id: uid(), present: true }];
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
    if (!project || !ready || submitting) return;
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

  const sources = [
    { value: "recording" as const, label: <><Mic className="size-3.5" />{c.source.record}</> },
    { value: "audio" as const, label: <><Upload className="size-3.5" />{c.source.upload}</> },
    { value: "transcript" as const, label: <><FileText className="size-3.5" />{c.source.transcript}</> },
  ];

  return (
    <Page wide>
      <PageHeader
        eyebrow={
          project ? (
            <span className="mf-num">
              ON {project.on} · {c.form.nextAr} {arCode(nextAr)}
            </span>
          ) : (
            c.nav.atas
          )
        }
        title={c.form.title}
        lead={c.form.lead}
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-mf-300 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">{c.form.source}</h2>
            <div className="overflow-x-auto">
              <Segmented value={kind} onChange={setKind} options={sources} />
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <div className={cx(kind !== "recording" && "hidden")}>
              <Recorder onChange={onRecording} />
            </div>
            {kind === "audio" && <AudioUpload value={audioFile} onChange={setAudioFile} />}
            {kind === "transcript" && <TranscriptUpload value={transcript} onChange={setTranscript} />}
          </div>
        </Card>

        <Card>
          <div className="border-b border-mf-300 px-5 py-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">{c.form.details}</h2>
          </div>
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <Field label={c.form.project}>
              <div className="flex gap-2">
                <Select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="flex-1">
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      ON {p.on} · {p.name} · {p.client}
                    </option>
                  ))}
                </Select>
                <Button icon={<Plus className="size-4" />} onClick={() => setCreatingProject(true)} aria-label={c.form.newProject}>
                  <span className="hidden sm:inline">{c.form.newProject}</span>
                </Button>
              </div>
            </Field>

            <Field label={c.form.meetingTitle}>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={c.form.meetingTitlePlaceholder} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <Field label={c.form.modality}>
              <Segmented
                value={modality}
                onChange={setModality}
                options={(["teams", "presencial", "hibrida"] as const).map((value) => ({ value, label: c.modality[value] }))}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={c.form.location}>
                <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={c.form.locationPlaceholder} />
              </Field>
              <Field label={c.form.secretary}>
                <Input value={secretary} onChange={(event) => setSecretary(event.target.value)} placeholder="Nome / Name" />
              </Field>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-mf-700">{c.form.participants}</span>
                <span className="text-[11.5px] text-mf-600">{c.form.participantsLead}</span>
              </div>
              {participants.map((person) => (
                <div key={person.id} className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2">
                  <Input value={person.name} onChange={(e) => updateParticipant(person.id, { name: e.target.value })} placeholder={c.form.name} className="h-9 text-[13px]" />
                  <Input value={person.company} onChange={(e) => updateParticipant(person.id, { company: e.target.value })} placeholder={c.form.company} className="h-9 text-[13px]" />
                  <Input value={person.role} onChange={(e) => updateParticipant(person.id, { role: e.target.value })} placeholder={c.form.role} className="h-9 text-[13px]" />
                  <button
                    type="button"
                    aria-label={c.delete}
                    onClick={() => setParticipants((current) => (current.length > 1 ? current.filter((p) => p.id !== person.id) : [blankParticipant()]))}
                    className="flex size-9 items-center justify-center rounded-md text-mf-600 hover:bg-mf-200 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setParticipants((current) => [...current, blankParticipant()])}>
                  {c.form.addParticipant}
                </Button>
              </div>
              {suggestions.length > 0 && (
                <div className="mt-1">
                  <div className="mb-2 text-[11px] text-mf-600">{c.form.suggested}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((person) => {
                      const added = participants.some((p) => p.name.toLowerCase() === person.name.toLowerCase());
                      return (
                        <button
                          key={person.name}
                          type="button"
                          disabled={added}
                          onClick={() => addSuggestion(person)}
                          className={cx(
                            "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] transition-colors",
                            added ? "border-mf-300 text-mf-600" : "border-mf-400 text-mf-900 hover:border-white hover:text-white",
                          )}
                        >
                          {!added && <Plus className="size-3" />}
                          {person.name}
                          <span className="text-mf-600">{person.company}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Field label={c.form.agenda} hint={c.optional}>
              <Textarea value={agenda} onChange={(event) => setAgenda(event.target.value)} placeholder={c.form.agendaPlaceholder} className="min-h-20" />
            </Field>
          </div>
        </Card>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-mf-300 bg-mf-50/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[12.5px] text-mf-700">
            {blocker ? (
              blocker
            ) : (
              <span className="text-mf-900">
                <span className="mf-num">{arCode(nextAr)}</span> · ON {project?.on} · {project?.name}
                {lang === "pt" ? " · pronto para gerar" : " · ready to generate"}
              </span>
            )}
          </div>
          <Button variant="primary" size="lg" disabled={Boolean(blocker)} loading={submitting} onClick={submit} icon={<ArrowRight className="size-4" />}>
            {c.form.generate}
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
