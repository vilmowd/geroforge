import { visibleLead } from "@/lib/html";

export const LINE_LEAD = 3;

export type DoorPeek = {
  id: string;
  title: string;
  line: string | null;
  sourceName: string;
  sourceUrl: string | null;
  slug: string;
};

export type LineOfferView = {
  id: string;
  line: string;
  picks: number;
  mine: boolean;
  picked: boolean;
};

export type ClipMarkKind = "INTERESTING" | "UNINTERESTING" | "INFORMATIVE";

export type ClipMarks = {
  interesting: number;
  uninteresting: number;
  informative: number;
  mine: ClipMarkKind | null;
};

type Pairable = {
  id: string;
  title: string;
  category: string;
  sourceName: string;
  createdAt: string;
  tldr: string | null;
  opening?: string[];
  sourceUrl: string | null;
  slug: string;
  door: DoorPeek | null;
  passedBy?: string | null;
};

const STOP = new Set([
  "this",
  "that",
  "with",
  "from",
  "after",
  "before",
  "about",
  "their",
  "there",
  "which",
  "would",
  "could",
  "should",
  "official",
  "update",
  "updates",
  "live",
  "says",
  "said",
  "just",
  "best",
  "more",
  "into",
  "over",
  "under",
  "than",
  "then",
  "them",
  "they",
  "have",
  "been",
  "will",
  "what",
  "when",
  "your",
  "news",
]);

export function cleanLine(value: string): string | null {
  const text = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (text.length < 20 || text.length > 160) return null;
  if (/https?:|www\./i.test(text)) return null;
  return text;
}

export function preferSources<T extends { sourceName: string }>(posts: T[], weights: Map<string, number>): T[] {
  if (weights.size === 0) return posts;
  const favored: T[] = [];
  const rest: T[] = [];
  for (const post of posts) {
    if ((weights.get(post.sourceName) ?? 0) > 0) favored.push(post);
    else rest.push(post);
  }
  if (favored.length === 0 || rest.length === 0) return posts;
  const out: T[] = [];
  let left = 0;
  let right = 0;
  while (left < favored.length || right < rest.length) {
    if (left < favored.length) out.push(favored[left]);
    left += 1;
    if (right < rest.length) out.push(rest[right]);
    right += 1;
    if (right < rest.length) out.push(rest[right]);
    right += 1;
  }
  return out;
}

export function pairDoors<T extends Pairable>(cards: T[], limit = 3): T[] {
  const used = new Set<string>();
  const out: T[] = [];
  let pairs = 0;
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    if (!card || used.has(card.id) || card.passedBy) {
      if (card && !used.has(card.id)) out.push(card);
      if (card) used.add(card.id);
      continue;
    }
    const partner = pairs < limit ? findPartner(card, cards, index, used) : null;
    if (partner) {
      used.add(card.id);
      used.add(partner.id);
      pairs += 1;
      out.push({
        ...card,
        door: {
          id: partner.id,
          title: partner.title,
          line: visibleLead(partner.opening ?? []) || null,
          sourceName: partner.sourceName,
          sourceUrl: partner.sourceUrl,
          slug: partner.slug,
        },
      });
      continue;
    }
    out.push(card);
  }
  return out;
}

function findPartner<T extends Pairable>(card: T, cards: T[], index: number, used: Set<string>): T | null {
  const mine = tokens(card.title);
  if (mine.size < 2) return null;
  const start = new Date(card.createdAt).getTime();
  if (!Number.isFinite(start)) return null;
  for (let next = index + 1; next < cards.length; next += 1) {
    const other = cards[next];
    if (!other || used.has(other.id) || other.door || other.passedBy) continue;
    if (other.sourceName === card.sourceName || other.category !== card.category) continue;
    const then = new Date(other.createdAt).getTime();
    if (!Number.isFinite(then) || Math.abs(then - start) > 7 * 24 * 60 * 60 * 1000) continue;
    if (shared(mine, tokens(other.title)) >= 2) return other;
  }
  return null;
}

function tokens(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 5 && !STOP.has(word));
  return new Set(words);
}

function shared(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const word of left) if (right.has(word)) count += 1;
  return count;
}
