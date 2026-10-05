export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.npm_lifecycle_event === "build") return;
  if (process.env.ENABLE_WORKER === "false") return;
  if (process.env.VERCEL === "1") return;

  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
