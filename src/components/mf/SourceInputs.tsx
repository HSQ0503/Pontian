"use client";

import { FileText, FileUp, Music, RotateCcw, Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { probeDuration } from "@/lib/mf/audio";
import { useCopy } from "@/lib/mf/copy";
import { bytes, clock } from "@/lib/mf/format";
import { parseTranscript, readTranscriptFile, type ParsedTranscript } from "@/lib/mf/transcript-parse";
import { Avatar, Button, cx, Textarea } from "./ui";

export type AudioFile = { file: File; duration: number };

const AUDIO_ACCEPT = "audio/*,video/*,.m4a,.mp3,.wav,.ogg,.opus,.webm,.mp4,.mov,.aac,.flac,.aiff";

export function AudioUpload({ value, onChange }: { value: AudioFile | null; onChange: (value: AudioFile | null) => void }) {
  const { c } = useCopy();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function accept(file: File | undefined) {
    if (!file) return;
    onChange({ file, duration: 0 });
    onChange({ file, duration: await probeDuration(file) });
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files[0]);
  }

  return (
    <div>
      <input ref={input} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={(event) => accept(event.target.files?.[0])} />
      {value ? (
        <div className="mf-rise flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-black">
            <Music className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-white">{value.file.name}</div>
            <div className="mf-num mt-0.5 text-[12px] text-mf-700">
              {value.duration ? `${clock(value.duration)} · ` : ""}
              {bytes(value.file.size)}
            </div>
          </div>
          <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={() => input.current?.click()}>
            {c.source.replace}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={cx(
            "flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center transition-colors",
            dragging ? "border-white bg-mf-200" : "border-mf-500 bg-mf-50 hover:border-mf-700 hover:bg-mf-100",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-xl border border-mf-500 text-white">
            <Upload className="size-5" />
          </span>
          <span className="mt-5 text-[15px] font-semibold text-white">{c.source.drop}</span>
          <span className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-mf-700">{c.source.dropLead}</span>
          <span className="mt-5 inline-flex h-8 items-center rounded-xl border border-mf-500 px-3 text-[12px] font-semibold text-mf-900">
            {c.source.choose}
          </span>
        </button>
      )}
    </div>
  );
}

export type TranscriptInput = { text: string; name: string; parsed: ParsedTranscript | null };

export function TranscriptUpload({ value, onChange }: { value: TranscriptInput; onChange: (value: TranscriptInput) => void }) {
  const { c } = useCopy();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function update(text: string, name: string) {
    const parsed = text.trim() ? parseTranscript(text) : null;
    onChange({ text, name, parsed: parsed?.segments.length ? parsed : null });
  }

  async function load(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      update(await readTranscriptFile(file), file.name);
    } catch {
      setError(c.source.unreadable);
    }
  }

  const parsed = value.parsed;
  return (
    <div className="flex flex-col gap-4">
      <input ref={input} type="file" accept=".vtt,.srt,.txt,.docx,.md,text/plain" className="hidden" onChange={(event) => load(event.target.files?.[0])} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-mf-700">{value.name || "Teams · Zoom · Meet · .txt"}</span>
        <Button size="sm" icon={<FileUp className="size-3.5" />} onClick={() => input.current?.click()}>
          {c.source.transcriptFile}
        </Button>
      </div>
      <Textarea
        value={value.text}
        onChange={(event) => update(event.target.value, "")}
        placeholder={c.source.paste}
        className="mf-scroll min-h-64 font-[family-name:var(--font-mf-code)] text-[12.5px]"
        spellCheck={false}
      />
      {error && <p className="text-[12.5px] text-mf-rec">{error}</p>}
      {parsed && (
        <div className="mf-rise rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-[12px] text-mf-800">
            <FileText className="size-3.5" />
            <span className="mf-eyebrow text-mf-700">{c.source.detected}</span>
            <span>
              {parsed.speakers.length} {c.source.speakers} · {parsed.segments.length} {c.source.lines}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {parsed.speakers.slice(0, 10).map((speaker, index) => (
              <span key={speaker.id} className="inline-flex items-center gap-2 rounded-xl border border-mf-400 py-1 pl-1 pr-3 text-[12px] text-mf-900">
                <Avatar name={speaker.name} index={index} size={22} />
                {speaker.name || speaker.id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
