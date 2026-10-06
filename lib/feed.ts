import { ContentType, type Prisma } from "@prisma/client";
import { buildCommentTree, type CommentNode } from "@/lib/comments";
import { youtubePoster } from "@/lib/embed";
import { interleave, mixSeed, shuffle, spreadSources } from "@/lib/mix";
import { postWhere } from "@/lib/post-ref";
import { prisma } from "@/lib/prisma";
import { openCursor, reveal, sealCursor } from "@/lib/seal";
import { pairDoors, preferSources, type DoorPeek, type LineOfferView } from "@/lib/digest";
import { attachDigest, peekPass, sourceWeights } from "@/lib/loops";
import { inferFormat, readRemix, type RemixedContent, type ShelfFormat } from "@/lib/remixer";
import { SOURCES } from "@/lib/sources";

export type FeedFilter =
  | "all"
  | "articles"
  | "videos"
  | "reels"
  | "news"
  | "world"
  | "posts"
  | "technology"
  | "science"
  | "ai"
  | "development"
  | "community";

export type FeedCard = {
  id: string;
  title: string;
  slug: string;
  contentType: "ARTICLE" | "VIDEO_EMBED";
  sourceName: string;
  sourceUrl: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  category: string;
  upvotesCount: number;
  commentCount: number;
  isAutomated: boolean;
  createdAt: string;
  tldr: string | null;
  opening: string[];
  statValues: string[];
  authorName: string | null;
  voted: boolean;
  format: ShelfFormat;
  deskLine: string | null;
  roomLine: string | null;
  kept: boolean;
  passedBy: string | null;
  door: DoorPeek | null;
  offers: LineOfferView[];
};

export type PostDetail = {
  id: string;
  title: string;
  slug: string;
  contentType: "ARTICLE" | "VIDEO_EMBED";
  sourceUrl: string | null;
  sourceName: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  category: string;
  upvotesCount: number;
  commentCount: number;
  isAutomated: boolean;
  createdAt: string;
  authorName: string | null;
  remix: RemixedContent | null;
  voted: boolean;
  format: ShelfFormat;
  comments: CommentNode[];
};

const FILTERS: FeedFilter[] = [
  "all",
  "articles",
  "videos",
  "reels",
  "news",
  "world",
  "posts",
  "technology",
  "science",
  "ai",
  "development",
  "community",
];

const RAILS: { id: FeedFilter; label: string }[] = [
  { id: "videos", label: "Videos" },
  { id: "reels", label: "Reels" },
  { id: "news", label: "News" },
  { id: "world", label: "World" },
  { id: "articles", label: "Articles" },
  { id: "posts", label: "Posts" },
];

export const FEED_PAGE_SIZE = 30;
const WINDOW_SIZE = 180;
const WINDOW_TTL_MS = 60_000;

const cardSelect = {
  id: true,
  title: true,
  slug: true,
  publicId: true,
  contentType: true,
  sourceName: true,
  sourceUrl: true,
  embedUrl: true,
  thumbnailUrl: true,
  category: true,
  upvotesCount: true,
  commentCount: true,
  isAutomated: true,
  createdAt: true,
  remixedContent: true,
  author: { select: { name: true } },
} satisfies Prisma.PostSelect;

type FeedRow = Prisma.PostGetPayload<{ select: typeof cardSelect }>;

const windows = new Map<string, { at: number; rows: FeedRow[] }>();
const flights = new Map<string, Promise<FeedRow[]>>();

export function parseFilter(value: string | undefined): FeedFilter {
  return FILTERS.includes(value as FeedFilter) ? (value as FeedFilter) : "all";
}

export async function getRails(userId?: string) {
  const rails = await Promise.all(
    RAILS.map(async (rail) => {
      const page = await getFeedPage(rail.id, userId, null, 10);
      return { id: rail.id, label: rail.label, posts: page.posts };
    }),
  );
  return rails.filter((rail) => rail.posts.length > 0);
}

export async function getFeedPage(
  filter: FeedFilter,
  userId?: string,
  cursor?: string | null,
  take = FEED_PAGE_SIZE,
  options?: { mix?: string; seenIds?: string[]; category?: string },
): Promise<{ posts: FeedCard[]; nextCursor: string | null; mix: string; caughtUp: boolean }> {
  const mix = validMix(options?.mix) || mixSeed();
  const seen = new Set((options?.seenIds || []).filter((id) => /^[a-z0-9]{8,40}$/i.test(id)).slice(0, 200));
  const category = validCategory(options?.category);
  const where = category ? { category } : whereForFilter(filter);
  const allowedNames = new Set(SOURCES.map((source) => source.sourceName));
  const keep = (rows: FeedRow[]) => rows.filter((post) => !post.isAutomated || allowedNames.has(post.sourceName));
  let pool = keep(await loadFeedWindow(category ? `category:${category}` : filter, where));
  const unseenCount = () => pool.filter((post) => !seen.has(post.id)).length;
  if (unseenCount() < 24) {
    const older = keep(await loadOlder(where, pool.map((post) => post.id)));
    const have = new Set(pool.map((post) => post.id));
    pool = pool.concat(older.filter((post) => !have.has(post.id)));
  }
  const ordered = preferSources(arrangeShelf(pool, filter, mix), await sourceWeights(userId));
  const start = decodeOffset(cursor, mix);
  const page: FeedRow[] = [];
  let index = start;
  while (index < ordered.length && page.length < take) {
    const post = ordered[index];
    index += 1;
    if (!post || seen.has(post.publicId) || seen.has(post.id)) continue;
    page.push(post);
  }
  const voted = await votedIds(
    userId,
    page.map((post) => post.id),
  );
  const pass = userId ? await peekPass(userId) : null;
  let cards = page.map((post) => toCard(post, voted.has(post.id)));
  if (pass) {
    const already = cards.find((card) => card.id === pass.publicId);
    if (already) {
      cards = [{ ...already, passedBy: pass.fromName }, ...cards.filter((card) => card.id !== pass.publicId)];
    } else {
      const row = await prisma.post.findFirst({ where: { publicId: pass.publicId }, select: cardSelect });
      if (row) {
        const passVote = await votedIds(userId, [row.id]);
        cards = [{ ...toCard(row, passVote.has(row.id)), passedBy: pass.fromName }, ...cards];
      }
    }
  }
  cards = pairDoors(await attachDigest(cards, userId));
  return {
    posts: cards,
    nextCursor: index < ordered.length ? sealCursor(mix, index) : null,
    mix,
    caughtUp: page.length === 0 && pool.length > 0 && !pass,
  };
}

export async function getPostDetail(slug: string, userId?: string): Promise<PostDetail | null> {
  const where = postWhere(slug);
  if (!where) return null;
  const post = await prisma.post.findFirst({
    where,
    include: {
      author: { select: { name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { name: true, karma: true, publicId: true } },
          ...(userId ? { likes: { where: { userId }, select: { id: true } } } : {}),
        },
      },
    },
  });
  if (!post) return null;

  const vote = userId
    ? await prisma.vote.findUnique({
        where: { userId_postId: { userId, postId: post.id } },
        select: { id: true },
      })
    : null;

  return {
    id: post.publicId,
    title: post.title,
    slug: post.publicId,
    contentType: post.contentType,
    sourceUrl: post.sourceUrl,
    sourceName: post.sourceName,
    embedUrl: post.embedUrl,
    thumbnailUrl: post.thumbnailUrl,
    category: post.category,
    upvotesCount: post.upvotesCount,
    commentCount: post.commentCount,
    isAutomated: post.isAutomated,
    createdAt: post.createdAt.toISOString(),
    authorName: post.author?.name ? reveal(post.author.name) || null : null,
    remix: readRemix(post.remixedContent),
    voted: Boolean(vote),
    format: inferFormat({
      contentType: post.contentType,
      sourceName: post.sourceName,
      sourceUrl: post.sourceUrl,
      embedUrl: post.embedUrl,
      category: post.category,
      stored: readRemix(post.remixedContent)?.format,
    }),
    comments: buildCommentTree(
      post.comments.map((comment) => ({
        ...comment,
        user: { ...comment.user, name: comment.user.name ? reveal(comment.user.name) || null : null },
      })),
    ),
  };
}

export async function getSidebarData() {
  const [postCount, videoCount, communityCount, commentCount, lastScrape, grouped] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { contentType: ContentType.VIDEO_EMBED } }),
    prisma.post.count({ where: { isAutomated: false } }),
    prisma.comment.count(),
    prisma.scrapeLog.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.post.groupBy({ by: ["category"], _count: { category: true } }),
  ]);

  return {
    postCount,
    videoCount,
    communityCount,
    commentCount,
    lastScrape: lastScrape
      ? { status: lastScrape.status, createdAt: lastScrape.createdAt.toISOString() }
      : null,
    trending: grouped
      .map((row) => ({ category: row.category, count: row._count.category }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

function toCard(
  post: {
    id: string;
    publicId: string;
    title: string;
    slug: string;
    contentType: "ARTICLE" | "VIDEO_EMBED";
    sourceName: string;
    sourceUrl?: string | null;
    embedUrl?: string | null;
    thumbnailUrl?: string | null;
    category: string;
    upvotesCount: number;
    commentCount: number;
    isAutomated: boolean;
    createdAt: Date;
    remixedContent: unknown;
    author: { name: string | null } | null;
  },
  voted: boolean,
): FeedCard {
  const remix = readRemix(post.remixedContent);
  return {
    id: post.publicId,
    title: post.title,
    slug: post.publicId,
    contentType: post.contentType,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl ?? null,
    embedUrl: post.embedUrl ?? null,
    thumbnailUrl: post.thumbnailUrl || youtubePoster(post.embedUrl) || youtubePoster(post.sourceUrl) || null,
    category: post.category,
    upvotesCount: post.upvotesCount,
    commentCount: post.commentCount,
    isAutomated: post.isAutomated,
    createdAt: post.createdAt.toISOString(),
    tldr: remix ? viewerExcerpt(remix) : null,
    opening: remix?.opening ?? [],
    statValues: remix?.stats.map((stat) => stat.value).slice(0, 1) ?? [],
    authorName: post.author?.name ? reveal(post.author.name) || null : null,
    voted,
    deskLine: remix ? viewerExcerpt(remix) : null,
    roomLine: null,
    kept: false,
    passedBy: null,
    door: null,
    offers: [],
    format: inferFormat({
      contentType: post.contentType,
      sourceName: post.sourceName,
      sourceUrl: post.sourceUrl,
      embedUrl: post.embedUrl,
      category: post.category,
      stored: remix?.format,
    }),
  };
}

export async function getWatchQueue(slug: string, userId?: string, seenIds: string[] = [], mix?: string) {
  const where = postWhere(slug);
  if (!where) return null;
  const start = await prisma.post.findFirst({
    where,
    select: cardSelect,
  });
  if (!start) return null;
  const voted = await votedIds(userId, [start.id]);
  const card = toCard(start, voted.has(start.id));
  const page = await getFeedPage("all", userId, null, 24, {
    mix,
    seenIds: seenIds.filter((id) => id !== start.id && id !== start.publicId),
  });
  const others = page.posts.filter((post) => post.id !== card.id);
  const before = others.slice(0, 8);
  const after = others.slice(8);
  return {
    posts: [...before, card, ...after],
    startIndex: before.length,
    nextCursor: page.nextCursor,
    mix: page.mix,
  };
}

async function loadFeedWindow(key: string, where: Prisma.PostWhereInput): Promise<FeedRow[]> {
  const cacheKey = `${key}:open`;
  const hit = windows.get(cacheKey);
  if (hit && Date.now() - hit.at < WINDOW_TTL_MS) return hit.rows;
  const pending = flights.get(key);
  if (pending) return pending;
  const job = prisma.post
    .findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: WINDOW_SIZE,
      select: cardSelect,
    })
    .then((rows) => {
      const slim = rows.map(slimRow);
      windows.set(cacheKey, { at: Date.now(), rows: slim });
      flights.delete(key);
      return slim;
    })
    .catch((error: unknown) => {
      flights.delete(key);
      if (hit) return hit.rows;
      throw error;
    });
  flights.set(key, job);
  return job;
}

function validCategory(value: string | undefined): string | null {
  if (!value || !/^[A-Za-z][A-Za-z ]{1,40}$/.test(value)) return null;
  return value;
}

function arrangeShelf(posts: FeedRow[], filter: FeedFilter, mix: string): FeedRow[] {
  if (filter === "all") return spreadSources(interleave(posts, mix, rowFormat));
  return spreadSources(shuffle(posts, mix));
}

function rowFormat(post: FeedRow): string {
  return inferFormat({
    contentType: post.contentType,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    embedUrl: post.embedUrl,
    category: post.category,
    stored: readRemix(post.remixedContent)?.format,
  });
}

async function loadOlder(where: Prisma.PostWhereInput, excludeIds: string[]): Promise<FeedRow[]> {
  const rows = await prisma.post.findMany({
    where: {
      AND: [where, excludeIds.length > 0 ? { id: { notIn: excludeIds.slice(0, 500) } } : {}],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: WINDOW_SIZE,
    select: cardSelect,
  });
  return rows.map(slimRow);
}

function viewerExcerpt(remix: RemixedContent): string {
  const body = (remix.markdown || remix.tldr).replace(/\s+/g, " ").trim();
  return (body || remix.tldr).slice(0, 520);
}

function slimRow(row: FeedRow): FeedRow {
  const remix = readRemix(row.remixedContent);
  if (!remix) return { ...row, remixedContent: null };
  return {
    ...row,
    remixedContent: {
      tldr: viewerExcerpt(remix),
      stats: remix.stats.slice(0, 1),
      markdown: "",
      keywords: [],
      format: remix.format,
      opening: remix.opening ?? [],
    },
  };
}

function validMix(value: string | undefined): string | null {
  return value && /^[a-z0-9]{6,16}$/i.test(value) ? value : null;
}

function decodeOffset(cursor: string | null | undefined, mix: string): number {
  if (!cursor) return 0;
  const opened = openCursor(cursor);
  if (!opened || opened.mix !== mix) return 0;
  return opened.offset;
}

function formatEquals(format: ShelfFormat): Prisma.PostWhereInput {
  return { remixedContent: { path: ["format"], equals: format } };
}

function whereForFilter(filter: FeedFilter): Prisma.PostWhereInput {
  if (filter === "articles") {
    return {
      contentType: "ARTICLE",
      NOT: { OR: [formatEquals("news"), formatEquals("world"), formatEquals("post")] },
    };
  }
  if (filter === "videos") return { contentType: "VIDEO_EMBED", NOT: formatEquals("reel") };
  if (filter === "reels") return formatEquals("reel");
  if (filter === "news") return formatEquals("news");
  if (filter === "world") return formatEquals("world");
  if (filter === "posts") return formatEquals("post");
  if (filter === "technology") return { category: "Technology" };
  if (filter === "science") return { category: "Science" };
  if (filter === "ai") return { category: "AI" };
  if (filter === "development") return { category: "Development" };
  if (filter === "community") return { isAutomated: false };
  return {};
}

async function votedIds(userId: string | undefined, postIds: string[]): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set();
  const votes = await prisma.vote.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(votes.map((vote) => vote.postId));
}
