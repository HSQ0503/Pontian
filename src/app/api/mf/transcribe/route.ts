import { google } from "@ai-sdk/google";
import { Output, streamText } from "ai";
import { transcribeContextSchema, transcriptionSchema, type TranscribeContext } from "@/lib/mf/ai-schema";
import { ndjsonResponse } from "@/lib/mf/ndjson";

export const maxDuration = 300;

const MODELS = (process.env.MF_TRANSCRIBE_MODELS ?? "gemini-3.5-flash,gemini-3.8-flash,gemini-2.5-flash")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
// Gemini rejects inline requests over ~20 MB; anything larger goes through its Files API.
const INLINE_LIMIT = 14 * 1024 * 1024;
const GEMINI = "https://generativelanguage.googleapis.com";

const SYSTEM = `Você é um transcritor profissional de reuniões de engenharia, em português do Brasil.

Regras:
- Transcreva tudo o que é dito, no idioma original, sem resumir, sem omitir e sem inventar. Preserve termos técnicos, siglas, códigos e números exatamente como ditos (ON 1155, CETESB, AR#006, HVAC, LI).
- Remova apenas hesitações sem conteúdo ("é...", "ãh") e repetições óbvias; nunca altere o sentido.
- Separe por falante. Cada voz diferente recebe um identificador S1, S2, S3... Quando a voz muda, comece um novo segmento.
- Um segmento por turno de fala. Quebre turnos longos (mais de ~40 segundos) em segmentos menores do mesmo falante.
- "start" é o início do segmento em MM:SS, contado a partir do início deste arquivo.
- Só dê nome a um falante quando ele se apresentar, for chamado pelo nome ou for inequívoco pela lista de participantes. Caso contrário, name = null.
- Trechos que não dá para entender: escreva [inaudível].`;

function prompt(context: TranscribeContext) {
  const lines = [`Trecho ${context.chunk + 1} de ${context.chunks} da gravação.`];
  if (context.participants.length) {
    lines.push(
      "Participantes informados:",
      ...context.participants.map(
        (p) => `- ${p.name}${p.company ? ` (${p.company})` : ""}${p.role ? `, ${p.role}` : ""}`,
      ),
    );
  }
  if (context.roster.length) {
    lines.push(
      "Falantes já identificados nos trechos anteriores. Reutilize o mesmo id para a mesma voz; vozes novas recebem o próximo número:",
      ...context.roster.map((s) => `- ${s.id}: ${s.description}${s.name ? ` (provavelmente ${s.name})` : ""}`),
    );
  }
  lines.push("Transcreva o áudio anexado.");
  return lines.join("\n");
}

const MIME_ALIASES: Record<string, string> = {
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/mp3": "audio/mpeg",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "video/quicktime": "video/mov",
};
const EXTENSIONS: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  webm: "audio/webm",
  mp4: "video/mp4",
  mov: "video/mov",
  aiff: "audio/aiff",
};

function mediaTypeOf(file: Blob) {
  const base = file.type.split(";")[0].trim().toLowerCase();
  if (base) return MIME_ALIASES[base] ?? base;
  const extension = file instanceof File ? file.name.split(".").pop()?.toLowerCase() : undefined;
  return (extension && EXTENSIONS[extension]) || "audio/mpeg";
}

async function uploadToGemini(file: Blob, mediaType: string, key: string) {
  const start = await fetch(`${GEMINI}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(file.size),
      "X-Goog-Upload-Header-Content-Type": mediaType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "mf-meeting-audio" } }),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) throw new Error(`Gemini upload failed (${start.status})`);

  const finish = await fetch(uploadUrl, {
    method: "POST",
    headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
    body: new Uint8Array(await file.arrayBuffer()),
  });
  if (!finish.ok) throw new Error(`Gemini upload failed (${finish.status})`);
  const { file: stored } = (await finish.json()) as { file: { name: string; uri: string; state: string } };

  let state = stored.state;
  for (let attempt = 0; state === "PROCESSING" && attempt < 90; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const check = await fetch(`${GEMINI}/v1beta/${stored.name}`, { headers: { "x-goog-api-key": key } });
    state = ((await check.json()) as { state: string }).state;
  }
  if (state !== "ACTIVE") throw new Error("Gemini could not process the audio file");
  return stored;
}

export async function POST(request: Request) {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return Response.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" }, { status: 500 });

  const form = await request.formData();
  const audio = form.get("audio");
  let context: TranscribeContext;
  try {
    context = transcribeContextSchema.parse(JSON.parse(String(form.get("context"))));
  } catch {
    return Response.json({ error: "Invalid transcription context" }, { status: 400 });
  }
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "No audio received" }, { status: 400 });
  }
  const mediaType = mediaTypeOf(audio);

  return ndjsonResponse(async (send) => {
    let uploaded: { name: string; uri: string } | null = null;
    try {
      const data =
        audio.size <= INLINE_LIMIT
          ? new Uint8Array(await audio.arrayBuffer())
          : new URL((uploaded = await uploadToGemini(audio, mediaType, key)).uri);

      let lastError: unknown = new Error("No transcription model available");
      for (const model of MODELS) {
        let streamed = false;
        let streamError: unknown = null;
        try {
          const result = streamText({
            model: google(model),
            system: SYSTEM,
            output: Output.object({ schema: transcriptionSchema }),
            messages: [
              { role: "user", content: [{ type: "text", text: prompt(context) }, { type: "file", data, mediaType }] },
            ],
            providerOptions: model.startsWith("gemini-3")
              ? { google: { thinkingConfig: { thinkingLevel: "low" } } }
              : undefined,
            maxRetries: 1,
            abortSignal: request.signal,
            onError: ({ error }) => {
              streamError = error;
            },
          });
          for await (const text of result.textStream) {
            streamed = true;
            send({ type: "delta", text });
          }
          if (streamError) throw streamError;
          const output = await result.output;
          send({ type: "done", data: { ...output, model } });
          return;
        } catch (error) {
          lastError = error;
          // Once text reached the browser, switching models would mix two transcripts.
          if (streamed || request.signal.aborted) throw error;
          send({ type: "status", message: `fallback:${model}` });
        }
      }
      throw lastError;
    } finally {
      if (uploaded) {
        await fetch(`${GEMINI}/v1beta/${uploaded.name}`, {
          method: "DELETE",
          headers: { "x-goog-api-key": key },
        }).catch(() => {});
      }
    }
  });
}
