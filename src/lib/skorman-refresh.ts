import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

const SCRIPTS = ["skorman-decisions.mjs", "skorman-parcels.mjs"] as const;
const PARCELS_FILE = path.join(process.cwd(), "public/skorman/parcels.json");

type RefreshJob = {
  running: boolean;
  lastError: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  step: string;
};

const globalState = globalThis as { skormanRefresh?: RefreshJob; skormanRefreshTimer?: boolean };

function job(): RefreshJob {
  globalState.skormanRefresh ??= { running: false, lastError: null, startedAt: null, finishedAt: null, step: "" };
  return globalState.skormanRefresh;
}

export function refreshEnabled() {
  return process.env.SKORMAN_REFRESH_ENABLED === "true" && !process.env.VERCEL;
}

export async function recordsGeneratedAt() {
  try {
    const data = JSON.parse(await readFile(PARCELS_FILE, "utf8")) as { generatedAt?: string };
    return data.generatedAt ?? null;
  } catch {
    return null;
  }
}

export async function refreshStatus() {
  const current = job();
  return {
    enabled: refreshEnabled(),
    running: current.running,
    lastError: current.lastError,
    startedAt: current.startedAt,
    finishedAt: current.finishedAt,
    step: current.step,
    recordsAt: await recordsGeneratedAt(),
    intervalHours: REFRESH_INTERVAL_MS / (60 * 60 * 1000),
  };
}

function runScript(script: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), "scripts", script)], {
      cwd: process.cwd(),
      env: process.env,
    });
    const take = (chunk: Buffer) => {
      const line = chunk.toString().replace(/\r/g, "\n").split("\n").map((part) => part.trim()).filter(Boolean).at(-1);
      if (line) job().step = line.slice(0, 180);
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${script} stopped (${code ?? "no exit code"})`))));
  });
}

export function startRefresh() {
  if (!refreshEnabled()) return false;
  const current = job();
  if (current.running) return false;
  current.running = true;
  current.lastError = null;
  current.startedAt = new Date().toISOString();
  current.finishedAt = null;
  current.step = "Starting";
  void (async () => {
    try {
      for (const script of SCRIPTS) {
        current.step = script === "skorman-decisions.mjs" ? "Reading meeting records" : "Matching parcels";
        await runScript(script);
      }
      current.lastError = null;
    } catch (error) {
      current.lastError = error instanceof Error ? error.message : "The read failed.";
    } finally {
      current.running = false;
      current.finishedAt = new Date().toISOString();
      current.step = "";
    }
  })();
  return true;
}

async function readIfStale() {
  if (!refreshEnabled() || job().running) return;
  const generatedAt = await recordsGeneratedAt();
  const age = generatedAt ? Date.now() - new Date(generatedAt).getTime() : Infinity;
  if (age >= REFRESH_INTERVAL_MS) startRefresh();
}

export function startSchedule() {
  if (!refreshEnabled() || globalState.skormanRefreshTimer) return;
  globalState.skormanRefreshTimer = true;
  void readIfStale();
  setInterval(() => void readIfStale(), REFRESH_INTERVAL_MS);
}
