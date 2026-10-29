"use client";

export type AudioChunk = { blob: Blob; offset: number; duration: number };

// Each part must stay under Vercel's 4.5 MB request limit. Long meetings are
// split, which also keeps every transcription request short and fast.
const MAX_UPLOAD = 4 * 1024 * 1024;
const CHUNK_SECONDS = 15 * 60;
const BITRATE = 32_000;
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
  if (DIRECT_TYPES.includes(baseType(file)) && file.size <= MAX_UPLOAD && knownDuration > 0 && knownDuration <= CHUNK_SECONDS) {
    onProgress(1);
    return [{ blob: file, offset: 0, duration: knownDuration }];
  }

  try {
    return await transcode(file, onProgress);
  } catch {
    // Without WebCodecs the original can only be sent whole, which works for small files.
    if (file.size > MAX_UPLOAD) throw new Error("file-too-large");
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
    ? { codec: "aac" as const, sampleRate: 44100, seconds: CHUNK_SECONDS, format: () => new mb.Mp4OutputFormat(), type: "audio/mp4" }
    : (await mb.canEncodeAudio("opus", { numberOfChannels: 1, sampleRate: 48000 }))
      ? { codec: "opus" as const, sampleRate: 48000, seconds: CHUNK_SECONDS, format: () => new mb.OggOutputFormat(), type: "audio/ogg" }
      : { codec: "pcm-s16" as const, sampleRate: 16000, seconds: 120, format: () => new mb.WavOutputFormat(), type: "audio/wav" };

  let count = Math.max(1, Math.ceil(duration / target.seconds));
  // If the encoder overshoots the bitrate, split finer and convert again.
  for (let attempt = 0; attempt < 3; attempt++) {
    const chunks: AudioChunk[] = [];
    const length = duration / count;
    for (let index = 0; index < count; index++) {
      const start = index * length;
      const end = index === count - 1 ? duration : start + length;
      const output = new mb.Output({ format: target.format(), target: new mb.BufferTarget() });
      const conversion = await mb.Conversion.init({
        input: new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) }),
        output,
        video: { discard: true },
        audio: { codec: target.codec, numberOfChannels: 1, sampleRate: target.sampleRate, quality: new mb.Quality(BITRATE) },
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
    const largest = Math.max(...chunks.map((chunk) => chunk.blob.size));
    if (largest <= MAX_UPLOAD) {
      onProgress(1);
      return chunks;
    }
    count = Math.ceil((count * largest) / (MAX_UPLOAD * 0.85));
  }
  throw new Error("file-too-large");
}
