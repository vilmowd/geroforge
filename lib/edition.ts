import { inferFormat, type ShelfFormat } from "@/lib/remixer";
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

export type DiscussedStory = EditionStory & { comments: number };

const TEXT = new Set<ShelfFormat>(["article", "news", "world", "post"]);
const STOP = new Set(["this", "that", "with", "from", "after", "before", "about", "their", "there", "which", "would", "could", "should", "says", "said"]);
const WIRE_COUNT = 8;
const FIVE_COUNT = 5;
const EARLIER_COUNT = 30;

type Seat = {
  sources: Set<string>;
  formats: Set<ShelfFormat>;
  categories: Set<string>;
  titles: Set<string>;
  topics: Set<string>[];
};

export function editionClock(now = new Date()) {
  const slot = ingestionSlot(now.getTime());
  const start = new Date(slot * SLOT_MS);
  const end = new Date((slot + 1) * SLOT_MS);
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
    name: "Today's edition",
    show: "The five",
    dateLabel,
    closesLabel,
  };
}

export function buildEdition(stories: EditionStory[], follows: FollowSet, now = new Date(), reservedTitles: string[] = []): HouseEdition {
  const clock = editionClock(now);
  const ranked = [...stories].sort(byInterest(follows));
  const newest = [...stories].sort(byNewest);
  const used = new Set<string>();
  const seat = emptySeat();
  for (const title of reservedTitles) {
    seat.titles.add(titleKey(title));
    const bag = tokens(title);
    if (bag.size >= 2) seat.topics.push(bag);
  }
  const lead = pickSpread(ranked, 1, used, seat, isText)[0] ?? pickSpread(ranked, 1, used, seat)[0] ?? null;
  const beside = pickSpread(ranked, 2, used, seat, isText);
  const clip = pickSpread(ranked, 1, used, seat, isPlay)[0] ?? null;
  const bundle = takeBundle(newest, used, seat);
  const five = pickMixed(ranked, FIVE_COUNT, used, seat);
  const wire = pickMixed(newest, WIRE_COUNT, used, seat);
  const earlier = pickMixed(newest, EARLIER_COUNT, used, seat);
  const desks = new Set(bundle.map((story) => story.category)).size;
  return {
    name: clock.name,
    show: clock.show,
    dateLabel: clock.dateLabel,
    closesLabel: clock.closesLabel,
    lead,
    beside,
    clip,
    five,
    wire,
    earlier,
    bundle,
    bundleTitle: bundle.length < 2 ? null : desks >= 2 ? "One story, several desks" : "Two sources, one story",
  };
}

export async function loadEditionStories(): Promise<EditionStory[]> {
  const rows = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 360,
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
    },
  });
  return rows.map(toStory);
}

export async function loadEdition(follows: FollowSet, now = new Date()): Promise<HouseEdition> {
  return buildEdition(await loadEditionStories(), follows, now);
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

export async function loadDiscussed(limit = 5): Promise<DiscussedStory[]> {
  const rows = await prisma.post.findMany({
    where: { commentCount: { gt: 0 } },
    orderBy: [{ commentCount: "desc" }, { createdAt: "desc" }],
    take: limit,
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
      commentCount: true,
    },
  });
  return rows.map((row) => ({ ...toStory(row), comments: row.commentCount }));
}

export async function loadDeskCounts(): Promise<Map<string, number>> {
  const rows = await prisma.post.groupBy({
    by: ["category"],
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.category, row._count._all]));
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
}): EditionStory {
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

function emptySeat(): Seat {
  return { sources: new Set(), formats: new Set(), categories: new Set(), titles: new Set(), topics: [] };
}

function pickSpread(
  list: EditionStory[],
  count: number,
  used: Set<string>,
  seat: Seat,
  allow: (story: EditionStory) => boolean = () => true,
) {
  const picked: EditionStory[] = [];
  const gates: Array<(story: EditionStory) => boolean> = [
    (story) => !seat.formats.has(story.format) && !seat.sources.has(story.sourceName) && !overlaps(story, seat),
    (story) => !seat.formats.has(story.format) && !overlaps(story, seat),
    (story) => !seat.sources.has(story.sourceName) && !overlaps(story, seat),
    (story) => !overlaps(story, seat),
  ];
  for (const gate of gates) {
    if (picked.length >= count) break;
    for (const story of list) {
      if (picked.length >= count) break;
      if (used.has(story.id) || !allow(story) || !gate(story)) continue;
      claim(story, used, seat);
      picked.push(story);
    }
  }
  return picked;
}

function pickMixed(list: EditionStory[], count: number, used: Set<string>, seat: Seat) {
  const open = list.filter((story) => !used.has(story.id) && !overlaps(story, seat));
  const buckets = new Map<ShelfFormat, EditionStory[]>();
  for (const story of open) {
    const bucket = buckets.get(story.format) ?? [];
    bucket.push(story);
    buckets.set(story.format, bucket);
  }
  const fresh = (["reel", "post", "video", "news", "world", "article"] as ShelfFormat[]).filter((format) => !seat.formats.has(format));
  const seen = (["video", "reel", "news", "world", "article", "post"] as ShelfFormat[]).filter((format) => seat.formats.has(format));
  const order = [...fresh, ...seen];
  const picked: EditionStory[] = [];
  let moved = true;
  while (picked.length < count && moved) {
    moved = false;
    for (const format of order) {
      if (picked.length >= count) break;
      const bucket = buckets.get(format);
      if (!bucket) continue;
      const story = bucket.find((item) => !used.has(item.id) && !seat.sources.has(item.sourceName)) ?? bucket.find((item) => !used.has(item.id));
      if (!story) continue;
      claim(story, used, seat);
      picked.push(story);
      moved = true;
    }
  }
  return picked;
}

function takeBundle(stories: EditionStory[], used: Set<string>, seat: Seat) {
  const bundle = findBundle(stories.filter((story) => isText(story) && !used.has(story.id) && !overlaps(story, seat)));
  for (const story of bundle) claim(story, used, seat);
  return bundle;
}

function claim(story: EditionStory, used: Set<string>, seat: Seat) {
  used.add(story.id);
  seat.sources.add(story.sourceName);
  seat.formats.add(story.format);
  seat.categories.add(story.category);
  seat.titles.add(titleKey(story.title));
  const bag = tokens(story.title);
  if (bag.size >= 2) seat.topics.push(bag);
}

function overlaps(story: EditionStory, seat: Seat) {
  if (seat.titles.has(titleKey(story.title))) return true;
  const mine = tokens(story.title);
  if (mine.size < 2) return false;
  return seat.topics.some((bag) => shared(bag, mine) >= 2);
}

function titleKey(title: string) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function findBundle(stories: EditionStory[]): EditionStory[] {
  let best: EditionStory[] = [];
  for (let index = 0; index < Math.min(stories.length, 80); index += 1) {
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
