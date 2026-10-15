import { refreshEnabled, refreshStatus, startRefresh } from "@/lib/skorman-refresh";

function allowed(request: Request) {
  const host = request.headers.get("host") ?? "";
  const local = host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
  const origin = request.headers.get("origin");
  const sameOrigin = !origin || origin === new URL(request.url).origin;
  return local && sameOrigin;
}

export async function GET(request: Request) {
  if (!allowed(request) || !refreshEnabled()) return Response.json({ enabled: false }, { status: 503 });
  return Response.json(await refreshStatus());
}

export async function POST(request: Request) {
  if (!allowed(request) || !refreshEnabled()) return Response.json({ error: "Refreshing filings is only available on this machine." }, { status: 503 });
  startRefresh();
  return Response.json(await refreshStatus());
}
