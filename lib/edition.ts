import { inferFormat, readRemix, type ShelfFormat } from "@/lib/remixer";
import { SLOT_MS, ingestionSlot } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { reveal } from "@/lib/seal";
import type { FollowSet } from "@/lib/follows";

export type EditionStory = {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl: string | null;
  category: string;
  createdAt: string;
  format: ShelfFormat;
  thumbnailUrl: string | null;
};

export type HouseEdition = {
  name: string;
  show: string;
  dateLabel: string;
  closesLabel: string;
  lead: EditionStory | null;
  beside: EditionStory[];
  clip: EditionStory | null;
  five: EditionStory[];
  wire: EditionStory[];
  earlier: EditionStory[];
  bundle: EditionStory[];
  bundleTitle: string | null;
};

export type KeptShow = {
  id: string;
  title: string;
  postId: string;
  sourceName: string;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  category: string;
  keeper: string;
};

const TEXT = new Set<ShelfFormat>(["article", "news", "world", "post"]);
const STOP = new Set(["this", "that", "with", "from", "after", "before", "about", "their", "there", "which", "would", "could", "should", "says", "said"]);

export function editionClock(now = new Date()) {
  const slot = ingestionSlot(now.getTime());
  const start = new Date(slot * SLOT_MS);
  const end = new Date((slot + 1) * SLOT_MS);
  const evening = start.getUTCHours() >= 12;
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(start);
  const closesLabel = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hourCycle: "h23",
  }).format(end);
  return {
    start,
    end,
    name: evening ? "Evening edition" : "Morning edition",
    show: evening ? "Evening five" : "Morning five",
    dateLabel,
    closesLabel,
  };
}

export function buildEdition(stories: EditionStory[], follows: FollowSet, now = new Date()): HouseEdition {
  const clock = editionClock(now);
  const ranked = [...stories].sort(byInterest(follows));
  const newest = [...stories].sort(byNewest);
  const used = new Set<string>();
  const lead = take(ranked, 1, used, isText)[0] ?? null;
  const beside: EditionStory[] = [];
  const besideSources = new Set(lead ? [lead.sourceName] : []);
  for (const story of ranked) {
    if (beside.length >= 2) break;
    if (!isText(story) || used.has(story.id) || besideSources.has(story.sourceName)) continue;
    used.add(story.id);
    besideSources.add(story.sourceName);
    beside.push(story);
  }
  const clip = take(ranked, 1, used, isPlay)[0] ?? null;
  const five = [lead, ...beside, clip].filter((story): story is EditionStory => Boolean(story));
  for (const story of ranked) {
    if (five.length >= 5) break;
    if (used.has(story.id)) continue;
    used.add(story.id);
    five.push(story);
  }
  const bundle = findBundle(newest.filter(isText));
  const desks = new Set(bundle.map((story) => story.category)).size;
  const wire = newest.slice(0, 8);
  const shown = new Set<string>([
    ...(lead ? [lead.id] : []),
    ...beside.map((story) => story.id),
    ...(clip ? [clip.id] : []),
    ...five.map((story) => story.id),
    ...wire.map((story) => story.id),
    ...bundle.map((story) => story.id),
  ]);
  return {
    name: clock.name,
    show: clock.show,
    dateLabel: clock.dateLabel,
    closesLabel: clock.closesLabel,
    lead,
    beside,
    clip,
    five: five.slice(0, 5),
    wire,
    earlier: newest.filter((story) => !shown.has(story.id)).slice(0, 24),
    bundle,
    bundleTitle: bundle.length < 2 ? null : desks >= 2 ? "One story, several desks" : "Two sources, one story",
  };
}

export async function loadEdition(follows: FollowSet, now = new Date()): Promise<HouseEdition> {
  const rows = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 240,
    select: {
      publicId: true,
      title: true,
      sourceName: true,
      sourceUrl: true,
      category: true,
      createdAt: true,
      contentType: true,
      embedUrl: true,
      thumbnailUrl: true,
      remixedContent: true,
    },
  });
  return buildEdition(rows.map(toStory), follows, now);
}

export async function loadKeptShow(): Promise<KeptShow[]> {
  const rows = await prisma.keptLine.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      sourceName: true,
      user: { select: { name: true } },
      post: { select: { publicId: true, title: true, sourceUrl: true, thumbnailUrl: true, category: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.post.title,
    postId: row.post.publicId,
    sourceName: row.sourceName,
    sourceUrl: row.post.sourceUrl,
    thumbnailUrl: row.post.thumbnailUrl && /^https?:\/\//i.test(row.post.thumbnailUrl) ? row.post.thumbnailUrl : null,
    category: row.post.category,
    keeper: row.user.name ? reveal(row.user.name) || "Reader" : "Reader",
  }));
}

function toStory(row: {
  publicId: string;
  title: string;
  sourceName: string;
  sourceUrl: string | null;
  category: string;
  createdAt: Date;
  contentType: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  remixedContent: unknown;
}): EditionStory {
  const remix = readRemix(row.remixedContent);
  return {
    id: row.publicId,
    title: row.title,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    format: inferFormat({
      contentType: row.contentType,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      embedUrl: row.embedUrl,
      category: row.category,
      stored: remix?.format,
    }),
    thumbnailUrl: row.thumbnailUrl && /^https?:\/\//i.test(row.thumbnailUrl) ? row.thumbnailUrl : null,
  };
}

function isText(story: EditionStory) {
  return TEXT.has(story.format);
}

function isPlay(story: EditionStory) {
  return story.format === "video" || story.format === "reel";
}

function byNewest(a: EditionStory, b: EditionStory) {
  const time = b.createdAt.localeCompare(a.createdAt);
  return time || a.id.localeCompare(b.id);
}

function byInterest(follows: FollowSet) {
  return (a: EditionStory, b: EditionStory) => {
    const score = interest(b, follows) - interest(a, follows);
    return score || byNewest(a, b);
  };
}

function interest(story: EditionStory, follows: FollowSet) {
  return (follows.desks.includes(story.category) ? 2 : 0) + (follows.sources.includes(story.sourceName) ? 3 : 0);
}

function take(list: EditionStory[], count: number, used: Set<string>, ok: (story: EditionStory) => boolean) {
  const picked: EditionStory[] = [];
  for (const story of list) {
    if (picked.length >= count) break;
    if (used.has(story.id) || !ok(story)) continue;
    used.add(story.id);
    picked.push(story);
  }
  return picked;
}

function findBundle(stories: EditionStory[]): EditionStory[] {
  let best: EditionStory[] = [];
  for (let index = 0; index < Math.min(stories.length, 24); index += 1) {
    const story = stories[index];
    if (!story) continue;
    const mine = tokens(story.title);
    if (mine.size < 2) continue;
    const group = [story];
    const sources = new Set([story.sourceName]);
    for (let next = index + 1; next < stories.length && group.length < 4; next += 1) {
      const other = stories[next];
      if (!other || sources.has(other.sourceName)) continue;
      if (shared(mine, tokens(other.title)) < 2) continue;
      group.push(other);
      sources.add(other.sourceName);
    }
    if (group.length > best.length) best = group;
  }
  return best.length >= 2 ? best : [];
}

function tokens(title: string) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 5 && !STOP.has(word)),
  );
}

function shared(left: Set<string>, right: Set<string>) {
  let count = 0;
  for (const word of left) if (right.has(word)) count += 1;
  return count;
}
