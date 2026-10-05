type Strike = { fails: number; until: number };

const strikes = new Map<string, Strike>();
const MAX_KEYS = 4000;
const STEPS_MS = [5_000, 15_000, 45_000, 120_000, 600_000, 1_800_000];

export const LOGIN_FAILURE = "Those details did not work. Try again in a little while.";

export function cooldownForFailures(fails: number): number {
  const index = Math.min(Math.max(fails, 1), STEPS_MS.length) - 1;
  return STEPS_MS[index] ?? STEPS_MS[STEPS_MS.length - 1];
}

export function loginCooling(key: string, now = Date.now()): boolean {
  const row = strikes.get(key);
  return Boolean(row && row.until > now);
}

export function noteLoginFailure(key: string, now = Date.now()): void {
  prune(now);
  const fails = (strikes.get(key)?.fails || 0) + 1;
  strikes.set(key, { fails, until: now + cooldownForFailures(fails) });
}

export function clearLoginFailure(key: string): void {
  strikes.delete(key);
}

function prune(now: number) {
  if (strikes.size < MAX_KEYS) return;
  for (const [key, row] of strikes) {
    if (row.until <= now) strikes.delete(key);
  }
  while (strikes.size > MAX_KEYS) {
    const oldest = strikes.keys().next().value;
    if (!oldest) break;
    strikes.delete(oldest);
  }
}
