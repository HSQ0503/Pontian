export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startSchedule } = await import("./lib/skorman-refresh");
  startSchedule();
}
