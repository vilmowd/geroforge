import type { Source } from "@/lib/sources";

export const DESKS = ["AI", "Development", "Science", "Entertainment", "Technology", "World"] as const;

export const RUNS_PER_DAY = 2;
export const PER_DESK_PER_RUN = 4;
export const PER_DESK_PER_DAY = PER_DESK_PER_RUN * RUNS_PER_DAY;
export const DAILY_CAP = PER_DESK_PER_DAY * DESKS.length;
export const SOURCES_PER_PASS = 8;

const SLOT_MS = 12 * 60 * 60 * 1000;

export function ingestionSlot(now = Date.now()): number {
  return Math.floor(now / SLOT_MS);
}

export function planDeskPasses(sources: Source[], slot: number, published: Map<string, number>): Source[][] {
  return DESKS.map((desk) => {
    if ((published.get(desk) || 0) >= PER_DESK_PER_DAY) return [];
    const group = sources.filter((source) => source.categoryHint === desk);
    if (group.length === 0) return [];
    const start = slot % group.length;
    return [...group.slice(start), ...group.slice(0, start)];
  });
}

export function spreadSources<T>(sources: T[], count: number): T[] {
  if (count <= 0) return [];
  if (sources.length <= count) return [...sources];
  const chosen: T[] = [];
  const used = new Set<number>();
  for (let step = 0; step < count; step += 1) {
    const index = Math.floor((step * sources.length) / count) % sources.length;
    if (used.has(index)) continue;
    used.add(index);
    const source = sources[index];
    if (source) chosen.push(source);
  }
  return chosen;
}
