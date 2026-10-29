"use client";

export type AudioChunk = { blob: Blob; offset: number; duration: number };

// Long meetings are split so each transcription request stays small and fast,
// and a model never has to keep hours of speech in one answer.
const CHUNK_SECONDS = 15 * 60;
const DIRECT_LIMIT = 14 * 1024 * 1024;
const DIRECT_TYPES = ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/flac"];

const baseType = (blob: Blob) => blob.type.split(";")[0].trim().toLowerCase();

export function probeDuration(blob: Blob) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(blob);
    const media = document.createElement(baseType(blob).startsWith("video") ? "video" : "audio");
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) ? value : 0);
    };
    media.preload = "metadata";
    media.onloadedmetadata = () => {
      // WebM recordings report Infinity until the browser has scanned to the end.
      if (media.duration === Infinity) {
        media.ontimeupdate = () => {
          media.ontimeupdate = null;
          done(media.duration);
        };
        media.currentTime = 1e9;
      } else done(media.duration);
    };
    media.onerror = () => done(0);
    media.src = url;
  });
}

export async function prepareAudio(file: Blob, onProgress: (fraction: number) => void): Promise<AudioChunk[]> {
  const knownDuration = await probeDuration(file);
  if (DIRECT_TYPES.includes(baseType(file)) && file.size <= DIRECT_LIMIT && knownDuration > 0 && knownDuration <= CHUNK_SECONDS) {
    onProgress(1);
    return [{ blob: file, offset: 0, duration: knownDuration }];
  }

  try {
    return await transcode(file, onProgress);
  } catch {
    // Without WebCodecs support we can still send the original file whole; the server
    // routes large files through Gemini's Files API.
    onProgress(1);
    return [{ blob: file, offset: 0, duration: knownDuration }];
  }
}

async function transcode(file: Blob, onProgress: (fraction: number) => void) {
  const mb = await import("mediabunny");
  const probe = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) });
  const duration = await probe.computeDuration();
  if (!duration) throw new Error("Empty audio");

  // AAC in MP4 transcribes several times faster on Gemini than Opus in Ogg, so it goes first.
  const target = (await mb.canEncodeAudio("aac", { numberOfChannels: 1, sampleRate: 44100 }))
    ? { codec: "aac" as const, sampleRate: 44100, format: () => new mb.Mp4OutputFormat(), type: "audio/mp4" }
    : (await mb.canEncodeAudio("opus", { numberOfChannels: 1, sampleRate: 48000 }))
      ? { codec: "opus" as const, sampleRate: 48000, format: () => new mb.OggOutputFormat(), type: "audio/ogg" }
      : { codec: "pcm-s16" as const, sampleRate: 16000, format: () => new mb.WavOutputFormat(), type: "audio/wav" };

  const count = Math.max(1, Math.ceil(duration / CHUNK_SECONDS));
  const length = duration / count;
  const chunks: AudioChunk[] = [];

  for (let index = 0; index < count; index++) {
    const start = index * length;
    const end = index === count - 1 ? duration : start + length;
    const output = new mb.Output({ format: target.format(), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({
      input: new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) }),
      output,
      video: { discard: true },
      audio: { codec: target.codec, numberOfChannels: 1, sampleRate: target.sampleRate, quality: mb.QUALITY_LOW },
      trim: { start, end },
      showWarnings: false,
    });
    if (!conversion.isValid) throw new Error("Unsupported audio");
    conversion.onProgress = (progress) => onProgress((index + progress) / count);
    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer) throw new Error("Conversion produced no audio");
    chunks.push({ blob: new Blob([buffer], { type: target.type }), offset: start, duration: end - start });
  }
  onProgress(1);
  return chunks;
}
