import { runIngestionCycle } from "@/lib/scraper";

const globalForWorker = globalThis as unknown as { forgeWorkerStarted?: boolean };
let running = false;
let tail: Promise<void> = Promise.resolve();

export function startScheduler() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.npm_lifecycle_event === "build") return;
  if (!process.env.DATABASE_URL) {
    console.info("[forge] worker skipped because DATABASE_URL is unset");
    return;
  }
  if (globalForWorker.forgeWorkerStarted) return;
  globalForWorker.forgeWorkerStarted = true;

  const everyMs = intervalFromSchedule(process.env.CRON_SCHEDULE || "0 */12 * * *");
  const timer = setInterval(() => {
    void kickIngestion();
  }, everyMs);
  timer.unref?.();

  if (process.env.SCRAPE_ON_BOOT !== "false") {
    const boot = setTimeout(() => void kickIngestion(), 15000);
    boot.unref?.();
  }

  console.info(`[forge] worker scheduled every ${Math.round(everyMs / 60000)} minutes`);
}

export function kickIngestion(): Promise<void> {
  tail = tail.then(runSafe, runSafe);
  return tail;
}

async function runSafe() {
  if (running) {
    console.info("[forge] ingestion already running");
    return;
  }
  running = true;
  try {
    await runIngestionCycle();
  } catch (error) {
    console.error("[forge] ingestion cycle failed", error);
  } finally {
    running = false;
  }
}

function intervalFromSchedule(expression: string): number {
  const match = expression.trim().match(/^0 \*\/(\d+) \* \* \*$/);
  const hours = match ? Number(match[1]) : 12;
  if (!Number.isInteger(hours) || hours < 1 || hours > 24) return 12 * 60 * 60 * 1000;
  return hours * 60 * 60 * 1000;
}
