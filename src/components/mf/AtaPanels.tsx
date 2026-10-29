"use client";

import { Copy, Download, Pause, Play, Plus, Quote, Search, Trash, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCopy } from "@/lib/mf/copy";
import { clock, daysUntil, download, shortDate, uid } from "@/lib/mf/format";
import { transcriptText } from "@/lib/mf/pipeline";
import { SECTIONS, STATUS } from "@/lib/mf/sections";
import { getAudio, patchMeeting } from "@/lib/mf/store";
import type { AtaItem, Bilingual, ItemStatus, Meeting, Participant, Risk, Subsection } from "@/lib/mf/types";
import { Avatar, Button, cx, Drawer, Field, Input, ItemStatusTag, RiskBars, Segmented, Select, Tag, Textarea } from "./ui";

export function blankItem(meeting: Meeting): AtaItem {
  return {
    id: uid(),
    number: "",
    section: 1,
    subsection: "",
    origins: [],
    firstDate: meeting.date,
    building: "-",
    pt: "",
    en: "",
    status: "info",
    responsible: "",
    deadline: "",
    deadlineHistory: [],
    deadlineText: "",
    risk: "low",
    isDecision: false,
    isAction: false,
    evidence: [],
    updates: null,
    note: "",
  };
}

/* ------------------------------------------------------------------ item editor */

export function ItemDrawer({
  item,
  isNew,
  subsections,
  participants,
  readOnly,
  onClose,
  onSave,
  onRemove,
  onJump,
}: {
  item: AtaItem;
  isNew: boolean;
  subsections: Subsection[];
  participants: Participant[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (item: AtaItem, newSubsection: Bilingual | null) => void;
  onRemove: () => void;
  onJump: (time: number) => void;
}) {
  const { c, lang } = useCopy();
  const [draft, setDraft] = useState(item);
  const [newSub, setNewSub] = useState<Bilingual>({ pt: "", en: "" });
  const sectionSubs = subsections.filter((sub) => sub.section === draft.section);
  const creating = draft.subsection === "__new" || (!sectionSubs.length && draft.subsection !== "");
  const set = (patch: Partial<AtaItem>) => setDraft((current) => ({ ...current, ...patch }));
  const valid = draft.pt.trim() && (!creating || newSub.pt.trim());

  return (
    <Drawer
      title={
        <span className="flex items-center gap-3">
          {isNew ? c.item.newItem : c.item.edit}
          {draft.number && <span className="mf-num rounded border border-mf-400 px-1.5 text-[12px] text-mf-800">{draft.number}</span>}
        </span>
      }
      onClose={onClose}
      footer={
        readOnly ? (
          <Button onClick={onClose}>{c.close}</Button>
        ) : (
          <>
            {!isNew ? (
              <Button variant="danger" size="sm" icon={<Trash className="size-3.5" />} onClick={onRemove}>
                {c.item.remove}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                {c.cancel}
              </Button>
              <Button variant="primary" disabled={!valid} onClick={() => onSave({ ...draft, subsection: creating ? "" : draft.subsection }, creating ? { pt: newSub.pt, en: newSub.en || newSub.pt } : null)}>
                {c.save}
              </Button>
            </div>
          </>
        )
      }
    >
      <fieldset disabled={readOnly} className="flex flex-col gap-5">
        {draft.updates && (
          <div className="rounded-md border border-mf-400 bg-mf-50 px-3.5 py-2.5 text-[12.5px] text-mf-800">
            {c.item.carried} <span className="mf-num font-semibold text-white">{draft.updates}</span> · {draft.origins.join(" · ")}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.item.section}>
            <Select
              value={draft.section}
              disabled={Boolean(draft.updates)}
              onChange={(event) => set({ section: Number(event.target.value), subsection: "" })}
            >
              {SECTIONS.map((section) => (
                <option key={section.n} value={section.n}>
                  {section.n} · {section[lang]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={c.item.subsection}>
            <Select value={creating ? "__new" : draft.subsection} disabled={Boolean(draft.updates)} onChange={(event) => set({ subsection: event.target.value })}>
              <option value="">{lang === "pt" ? "Escolher…" : "Choose…"}</option>
              {sectionSubs.map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.code} · {lang === "pt" ? sub.pt : sub.en}
                </option>
              ))}
              <option value="__new">+ {c.item.newSubsection}</option>
            </Select>
          </Field>
        </div>
        {creating && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.item.subsectionPt}>
              <Input value={newSub.pt} onChange={(e) => setNewSub({ ...newSub, pt: e.target.value })} placeholder="IMPLANTAÇÃO" />
            </Field>
            <Field label={c.item.subsectionEn}>
              <Input value={newSub.en} onChange={(e) => setNewSub({ ...newSub, en: e.target.value })} placeholder="SITE PLAN" />
            </Field>
          </div>
        )}
        <Field label={c.item.textPt}>
          <Textarea value={draft.pt} onChange={(e) => set({ pt: e.target.value })} className="min-h-28" />
        </Field>
        <Field label={c.item.textEn}>
          <Textarea value={draft.en} onChange={(e) => set({ en: e.target.value })} className="min-h-24" />
        </Field>
        <Field label={c.item.status}>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<ItemStatus>
              value={draft.status}
              onChange={(status) => set({ status })}
              options={(["info", "progress", "closed"] as const).map((value) => ({ value, label: STATUS[value][lang] }))}
            />
            <Toggle checked={draft.isDecision} onChange={(isDecision) => set({ isDecision })} label={c.item.decision} />
            <Toggle checked={draft.isAction} onChange={(isAction) => set({ isAction, status: isAction && draft.status === "info" ? "progress" : draft.status })} label={c.item.action} />
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.item.responsible}>
            <Input list="mf-people" value={draft.responsible} onChange={(e) => set({ responsible: e.target.value })} placeholder="MF, cliente, nome…" />
            <datalist id="mf-people">
              {participants.map((p) => (
                <option key={p.id} value={`${p.name}${p.company ? ` (${p.company})` : ""}`} />
              ))}
            </datalist>
          </Field>
          <Field label={c.item.deadline} hint={draft.deadlineText ? `“${draft.deadlineText}”` : undefined}>
            <Input type="date" value={draft.deadline} onChange={(e) => set({ deadline: e.target.value })} className="mf-num [color-scheme:dark]" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.item.risk}>
            <Segmented<Risk>
              value={draft.risk}
              onChange={(risk) => set({ risk })}
              options={(["low", "medium", "high"] as const).map((value) => ({ value, label: <RiskBars risk={value} lang={lang} /> }))}
            />
          </Field>
          <Field label={c.item.building}>
            <Input value={draft.building === "-" ? "" : draft.building} onChange={(e) => set({ building: e.target.value || "-" })} placeholder="-" />
          </Field>
        </div>
        <Field label={c.item.note} hint={c.item.noteHelp}>
          <Textarea value={draft.note} onChange={(e) => set({ note: e.target.value })} className="min-h-16" />
        </Field>
        {draft.evidence.length > 0 && (
          <div>
            <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-mf-700">{c.item.evidence}</div>
            <div className="flex flex-col gap-2">
              {draft.evidence.map((evidence, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onJump(evidence.time)}
                  className="group flex gap-3 rounded-md border border-mf-400 bg-mf-50 px-3.5 py-2.5 text-left transition-colors hover:border-mf-700"
                >
                  <Quote className="mt-0.5 size-3.5 shrink-0 text-mf-600" />
                  <span className="flex-1 text-[12.5px] italic leading-relaxed text-mf-900">{evidence.quote}</span>
                  <span className="mf-num shrink-0 text-[11.5px] text-mf-700 group-hover:text-white">{clock(evidence.time)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </fieldset>
    </Drawer>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[12.5px] font-semibold transition-colors",
        checked ? "border-white bg-white text-black" : "border-mf-400 text-mf-700 hover:text-white",
      )}
    >
      <span className={cx("size-2 rounded-full", checked ? "bg-black" : "bg-mf-500")} />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ header editor */

export function MetaDrawer({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const { c, lang } = useCopy();
  const ata = meeting.ata!;
  const [form, setForm] = useState({
    titlePt: ata.title.pt,
    titleEn: ata.title.en,
    summaryPt: ata.summary.pt,
    summaryEn: ata.summary.en,
    date: meeting.date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    location: meeting.location,
    secretary: meeting.secretary,
  });
  const [people, setPeople] = useState(meeting.participants);
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    await patchMeeting(meeting.id, {
      title: form.titlePt,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location,
      secretary: form.secretary,
      participants: people.filter((p) => p.name.trim()),
      ata: { ...ata, title: { pt: form.titlePt, en: form.titleEn }, summary: { pt: form.summaryPt, en: form.summaryEn } },
    });
    onClose();
  }

  return (
    <Drawer
      title={c.form.details}
      onClose={onClose}
      footer={
        <>
          <span />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {c.cancel}
            </Button>
            <Button variant="primary" onClick={save}>
              {c.save}
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label={`${c.form.meetingTitle} (PT)`}>
          <Input value={form.titlePt} onChange={(e) => set("titlePt")(e.target.value)} />
        </Field>
        <Field label={`${c.form.meetingTitle} (EN)`}>
          <Input value={form.titleEn} onChange={(e) => set("titleEn")(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={c.form.date}>
            <Input type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} className="mf-num [color-scheme:dark]" />
          </Field>
          <Field label={c.form.start}>
            <Input type="time" value={form.startTime} onChange={(e) => set("startTime")(e.target.value)} className="mf-num [color-scheme:dark]" />
          </Field>
          <Field label={lang === "pt" ? "Término" : "End"}>
            <Input type="time" value={form.endTime} onChange={(e) => set("endTime")(e.target.value)} className="mf-num [color-scheme:dark]" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.form.location}>
            <Input value={form.location} onChange={(e) => set("location")(e.target.value)} />
          </Field>
          <Field label={c.form.secretary}>
            <Input value={form.secretary} onChange={(e) => set("secretary")(e.target.value)} />
          </Field>
        </div>
        <div>
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-mf-700">{c.form.participants}</div>
          <div className="flex flex-col gap-2">
            {people.map((person) => (
              <div key={person.id} className="grid grid-cols-[1.3fr_1fr_auto_auto] items-center gap-2">
                <Input className="h-9 text-[13px]" value={person.name} onChange={(e) => setPeople(people.map((p) => (p.id === person.id ? { ...p, name: e.target.value } : p)))} />
                <Input className="h-9 text-[13px]" value={person.company} onChange={(e) => setPeople(people.map((p) => (p.id === person.id ? { ...p, company: e.target.value } : p)))} />
                <Toggle
                  checked={person.present}
                  label={person.present ? (lang === "pt" ? "Presente" : "Present") : lang === "pt" ? "Ausente" : "Absent"}
                  onChange={(present) => setPeople(people.map((p) => (p.id === person.id ? { ...p, present } : p)))}
                />
                <button type="button" aria-label={c.delete} onClick={() => setPeople(people.filter((p) => p.id !== person.id))} className="flex size-9 items-center justify-center text-mf-600 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setPeople([...people, { id: uid(), name: "", company: "", role: "", present: true }])} className="self-start">
              {c.form.addParticipant}
            </Button>
          </div>
        </div>
        <Field label={lang === "pt" ? "Resumo (PT)" : "Summary (PT)"}>
          <Textarea value={form.summaryPt} onChange={(e) => set("summaryPt")(e.target.value)} />
        </Field>
        <Field label={lang === "pt" ? "Resumo (EN)" : "Summary (EN)"}>
          <Textarea value={form.summaryEn} onChange={(e) => set("summaryEn")(e.target.value)} />
        </Field>
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ transcript */

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, index) =>
    index % 2 ? (
      <mark key={index} className="rounded-sm bg-white px-0.5 text-black">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function TranscriptPanel({ meeting, focus }: { meeting: Meeting; focus: { time: number; key: number } | null }) {
  const { c } = useCopy();
  const [audioUrl, setAudioUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(meeting.source.duration);
  const [rate, setRate] = useState(1);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let alive = true;
    let url = "";
    if (meeting.hasAudio) {
      getAudio(meeting.id).then((blob) => {
        if (!alive || !blob) return;
        url = URL.createObjectURL(blob);
        setAudioUrl(url);
      });
    }
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [meeting.id, meeting.hasAudio]);

  useEffect(() => {
    if (!focus) return;
    const nearest = [...meeting.segments].reverse().find((segment) => segment.start <= focus.time + 1) ?? meeting.segments[0];
    if (nearest) document.getElementById(`seg-${nearest.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (audio.current) audio.current.currentTime = focus.time;
  }, [focus, meeting.segments]);

  const speakerIndex = useMemo(() => new Map(meeting.speakers.map((s, i) => [s.id, i])), [meeting.speakers]);
  const groups = useMemo(() => {
    const filtered = query ? meeting.segments.filter((s) => s.text.toLowerCase().includes(query.toLowerCase())) : meeting.segments;
    const result: { speakerId: string; segments: typeof filtered }[] = [];
    for (const segment of filtered) {
      const last = result.at(-1);
      if (last && last.speakerId === segment.speakerId && !query) last.segments.push(segment);
      else result.push({ speakerId: segment.speakerId, segments: [segment] });
    }
    return result;
  }, [meeting.segments, query]);
  const active = [...meeting.segments].reverse().find((s) => s.start <= time)?.id;

  function seek(seconds: number) {
    if (!audio.current) return;
    audio.current.currentTime = seconds;
    audio.current.play().catch(() => {});
  }

  function toggle() {
    if (!audio.current) return;
    if (audio.current.paused) audio.current.play().catch(() => {});
    else audio.current.pause();
  }

  function cycleRate() {
    const next = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audio.current) audio.current.playbackRate = next;
  }

  const text = () => transcriptText(meeting);

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-10 flex flex-col gap-3 rounded-xl border border-mf-400 bg-mf-100/95 p-3 backdrop-blur lg:top-14 xl:flex-row xl:items-center">
        {audioUrl ? (
          <div className="flex flex-1 items-center gap-3">
            <audio
              ref={audio}
              src={audioUrl}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
            />
            <button type="button" onClick={toggle} aria-label="Play" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black">
              {playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
            </button>
            <span className="mf-num w-14 text-[12px] text-mf-800">{clock(time)}</span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={Math.min(time, duration || 1)}
              onChange={(e) => {
                if (audio.current) audio.current.currentTime = Number(e.target.value);
              }}
              className="h-1 flex-1 accent-white"
              aria-label="Seek"
            />
            <span className="mf-num w-14 text-right text-[12px] text-mf-600">{clock(duration)}</span>
            <button type="button" onClick={cycleRate} className="mf-num h-7 rounded border border-mf-400 px-2 text-[11px] text-mf-800 hover:text-white">
              {rate}×
            </button>
          </div>
        ) : (
          <span className="flex-1 px-1 text-[12.5px] text-mf-700">{c.transcript.noAudio}</span>
        )}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mf-600" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.transcript.search} className="h-9 w-full pl-8 text-[12.5px] sm:w-56" />
          </div>
          <Button
            size="sm"
            icon={<Copy className="size-3.5" />}
            onClick={() => {
              navigator.clipboard.writeText(text()).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? c.transcript.copied : c.transcript.copy}
          </Button>
          <Button size="sm" icon={<Download className="size-3.5" />} onClick={() => download(`transcricao-${meeting.ar}.txt`, new Blob([text()], { type: "text/plain;charset=utf-8" }))} aria-label="TXT">
            TXT
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {groups.map((group, index) => {
          const speaker = meeting.speakers.find((s) => s.id === group.speakerId);
          const name = speaker?.name || c.transcript.unknown;
          return (
            <div key={`${group.speakerId}-${index}`} className="flex gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-mf-100">
              <Avatar name={speaker?.name ?? ""} index={speakerIndex.get(group.speakerId) ?? 0} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[13px] font-semibold text-white">{name}</span>
                  {speaker?.company && <span className="text-[12px] text-mf-700">{speaker.company}</span>}
                  <span className="mf-num text-[10.5px] text-mf-600">{group.speakerId}</span>
                </div>
                <div className="mt-1 flex flex-col gap-1.5">
                  {group.segments.map((segment) => (
                    <p
                      key={segment.id}
                      id={`seg-${segment.id}`}
                      className={cx(
                        "group/seg -mx-2 flex gap-3 rounded px-2 py-0.5 text-[14px] leading-relaxed transition-colors",
                        active === segment.id && playing ? "bg-mf-200 text-white" : "text-mf-900",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => seek(segment.start)}
                        className="mf-num mt-[3px] shrink-0 text-[11px] text-mf-600 transition-colors hover:text-white disabled:hover:text-mf-600"
                        disabled={!audioUrl}
                      >
                        {clock(segment.start)}
                      </button>
                      <span>{highlight(segment.text, query)}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ speakers */

export function SpeakersPanel({ meeting, onRegenerate }: { meeting: Meeting; onRegenerate: () => void }) {
  const { c } = useCopy();
  const [drafts, setDrafts] = useState(() => Object.fromEntries(meeting.speakers.map((s) => [s.id, { name: s.name, company: s.company }])));
  const [merges, setMerges] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const totals = useMemo(() => {
    const result = new Map<string, { turns: number; chars: number; sample: string }>();
    for (const segment of meeting.segments) {
      const entry = result.get(segment.speakerId) ?? { turns: 0, chars: 0, sample: "" };
      entry.turns++;
      entry.chars += segment.text.length;
      if (!entry.sample && segment.text.length > 40) entry.sample = segment.text;
      result.set(segment.speakerId, entry);
    }
    return result;
  }, [meeting.segments]);
  const totalChars = [...totals.values()].reduce((sum, entry) => sum + entry.chars, 0) || 1;

  async function save() {
    setSaving(true);
    const target = (id: string) => merges[id] || id;
    const speakers = meeting.speakers
      .filter((s) => !merges[s.id])
      .map((s) => {
        const edit = drafts[s.id];
        const changed = edit.name !== s.name || edit.company !== s.company;
        return { ...s, name: edit.name.trim(), company: edit.company.trim(), guessed: changed ? false : s.guessed };
      });
    const segments = meeting.segments.map((segment) => ({ ...segment, speakerId: target(segment.speakerId) }));
    const participants = [...meeting.participants];
    for (const speaker of speakers) {
      if (speaker.name && !participants.some((p) => p.name.toLowerCase() === speaker.name.toLowerCase())) {
        participants.push({ id: uid(), name: speaker.name, company: speaker.company, role: "", present: true });
      }
    }
    await patchMeeting(meeting.id, { speakers, segments, participants });
    setMerges({});
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-mf-700">{c.speakers.lead}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {meeting.speakers.map((speaker, index) => {
          const stats = totals.get(speaker.id) ?? { turns: 0, chars: 0, sample: "" };
          const draft = drafts[speaker.id] ?? { name: "", company: "" };
          return (
            <div key={speaker.id} className={cx("rounded-xl border bg-mf-100 p-5 transition-opacity", merges[speaker.id] ? "border-dashed border-mf-500 opacity-50" : "border-mf-300")}>
              <div className="flex items-start gap-4">
                <Avatar name={draft.name} index={index} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="mf-num text-[12px] text-mf-700">{speaker.id}</span>
                    {speaker.guessed && <Tag tone="warn">{c.speakers.guessed}</Tag>}
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-mf-600">{speaker.description}</p>
                </div>
                <div className="text-right">
                  <div className="mf-num text-[18px] font-medium text-white">{Math.round((stats.chars / totalChars) * 100)}%</div>
                  <div className="text-[10.5px] text-mf-600">
                    {stats.turns} {c.speakers.turns}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[1.3fr_1fr] gap-2">
                <Input value={draft.name} placeholder={c.form.name} onChange={(e) => setDrafts({ ...drafts, [speaker.id]: { ...draft, name: e.target.value } })} />
                <Input value={draft.company} placeholder={c.form.company} onChange={(e) => setDrafts({ ...drafts, [speaker.id]: { ...draft, company: e.target.value } })} />
              </div>
              {stats.sample && <p className="mt-3 line-clamp-2 text-[12.5px] italic leading-relaxed text-mf-700">“{stats.sample}”</p>}
              {meeting.speakers.length > 1 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11.5px] text-mf-600">{c.speakers.merge}</span>
                  <Select value={merges[speaker.id] ?? ""} onChange={(e) => setMerges({ ...merges, [speaker.id]: e.target.value })} className="flex-1 [&_select]:h-8 [&_select]:text-[12px]">
                    <option value="">{c.speakers.mergeNone}</option>
                    {meeting.speakers
                      .filter((other) => other.id !== speaker.id && !merges[other.id])
                      .map((other) => (
                        <option key={other.id} value={other.id}>
                          {other.id} · {drafts[other.id]?.name || c.transcript.unknown}
                        </option>
                      ))}
                  </Select>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={save} loading={saving}>
          {c.save}
        </Button>
        <Button
          variant="primary"
          icon={<WandSparkles className="size-4" />}
          onClick={async () => {
            await save();
            onRegenerate();
          }}
        >
          {c.speakers.apply}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ action plan */

export function ActionPlanPanel({ meeting, readOnly, onUpdate }: { meeting: Meeting; readOnly: boolean; onUpdate: (item: AtaItem) => void }) {
  const { c, lang } = useCopy();
  const actions = (meeting.ata?.items ?? [])
    .filter((item) => item.isAction || item.status === "progress")
    .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  if (!actions.length) return <p className="py-10 text-center text-[13px] text-mf-700">{c.actions.empty}</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-mf-700">{c.actions.lead}</p>
      <div className="overflow-x-auto rounded-xl border border-mf-300">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead className="border-b border-mf-300 bg-mf-100 text-[10.5px] uppercase tracking-[0.12em] text-mf-600">
            <tr>
              <th className="px-4 py-3 font-semibold">{c.actions.colItem}</th>
              <th className="px-4 py-3 font-semibold">{c.actions.colAction}</th>
              <th className="px-4 py-3 font-semibold">{c.item.responsible}</th>
              <th className="px-4 py-3 font-semibold">{c.item.deadline}</th>
              <th className="px-4 py-3 font-semibold">{c.item.status}</th>
              <th className="px-4 py-3 font-semibold">{c.item.risk}</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((item) => {
              const days = daysUntil(item.deadline);
              return (
                <tr key={item.id} className="border-b border-mf-300 last:border-0">
                  <td className="mf-num px-4 py-3 align-top text-[12px] font-semibold text-white">{item.number}</td>
                  <td className="max-w-md px-4 py-3 align-top leading-relaxed text-mf-900">
                    {lang === "pt" ? item.pt : item.en}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Input
                      key={`${item.id}-${item.responsible}`}
                      defaultValue={item.responsible}
                      disabled={readOnly}
                      onBlur={(e) => e.target.value !== item.responsible && onUpdate({ ...item, responsible: e.target.value })}
                      className="h-8 w-40 text-[12.5px]"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Input type="date" value={item.deadline} disabled={readOnly} onChange={(e) => onUpdate({ ...item, deadline: e.target.value })} className="mf-num h-8 w-36 text-[12px] [color-scheme:dark]" />
                    {days !== null && item.status === "progress" && (
                      <div className={cx("mt-1 text-[11px]", days < 0 ? "text-mf-rec" : days <= 7 ? "text-mf-warn" : "text-mf-600")}>
                        {days < 0 ? `${shortDate(item.deadline)} · ${c.actions.overdue}` : days === 0 ? c.actions.today : c.actions.inDays.replace("{n}", String(days))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {readOnly ? (
                      <ItemStatusTag status={item.status} lang={lang} />
                    ) : (
                      <Select value={item.status} onChange={(e) => onUpdate({ ...item, status: e.target.value as ItemStatus })} className="w-36 [&_select]:h-8 [&_select]:text-[12.5px]">
                        {(["info", "progress", "closed"] as const).map((status) => (
                          <option key={status} value={status}>
                            {STATUS[status][lang]}
                          </option>
                        ))}
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <RiskBars risk={item.risk} lang={lang} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
