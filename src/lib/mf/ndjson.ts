export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "status"; message: string }
  | { type: "done"; data: unknown }
  | { type: "error"; message: string };

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Unexpected error";
}

// Long model calls stream newline-delimited JSON so the browser can show work as it happens.
export function ndjsonResponse(run: (send: (event: StreamEvent) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await run(send);
      } catch (error) {
        send({ type: "error", message: errorMessage(error) });
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function readNdjson(response: Response, onEvent: (event: StreamEvent) => void) {
  if (!response.ok || !response.body) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {}
    throw new Error(message);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const flush = (line: string) => {
    if (line.trim()) onEvent(JSON.parse(line) as StreamEvent);
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      flush(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
  }
  flush(buffer);
}
