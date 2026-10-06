import { DESKS } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";

export type FollowSet = {
  desks: string[];
  sources: string[];
};

export async function readFollows(userId?: string): Promise<FollowSet> {
  if (!userId) return { desks: [], sources: [] };
  const [desks, sources] = await Promise.all([
    prisma.deskFollow.findMany({ where: { userId }, select: { desk: true } }),
    prisma.sourceFollow.findMany({ where: { userId }, select: { sourceName: true } }),
  ]);
  return {
    desks: desks.map((row) => row.desk),
    sources: sources.map((row) => row.sourceName),
  };
}

export function knownDesk(value: string): string | null {
  const desk = DESKS.find((item) => item.toLowerCase() === value.trim().toLowerCase());
  return desk ?? null;
}

export function cleanSourceName(value: string): string | null {
  const text = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (text.length < 2 || text.length > 80) return null;
  return text;
}

export function leadWithFollows<T extends { category: string; sourceName: string }>(cards: T[], follows: FollowSet): T[] {
  if (follows.desks.length === 0 && follows.sources.length === 0) return cards;
  const front: T[] = [];
  const rest: T[] = [];
  for (const card of cards) {
    if (follows.desks.includes(card.category) || follows.sources.includes(card.sourceName)) front.push(card);
    else rest.push(card);
  }
  if (front.length === 0 || rest.length === 0) return cards;
  return front.concat(rest);
}
