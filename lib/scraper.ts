import { Prisma, ScrapeStatus } from "@prisma/client";
import {
  canonicalVideoPage,
  isAllowedEmbedUrl,
  youtubePoster,
  isDirectMedia,
  isVideoHost,
  redditVideoEmbed,
  toEmbedUrl,
} from "@/lib/embed";
import { IngestError, toIngestError } from "@/lib/errors";
import { collapseTitle, extractArticle, leadParagraphs } from "@/lib/html";
import { pruneOperationalLogs } from "@/lib/maintenance";
import { prisma } from "@/lib/prisma";
import { type RemixedContent, type ShelfFormat, remixText } from "@/lib/remixer";
import { listingScore, redditClip, redditClipRank, shelfFormat, SHORT_FORM_SECONDS, type RedditListing } from "@/lib/clips";
import { DAILY_CAP, DESKS, PER_DESK_PER_DAY, PER_DESK_PER_RUN, REELS_PER_RUN, VIDEOS_PER_RUN, SOURCES_PER_PASS, ingestionSlot, planDeskPasses, spreadSources } from "@/lib/pipeline";
import { newPublicId } from "@/lib/public-id";
import { slugify } from "@/lib/slug";
import { SOURCES, type Source } from "@/lib/sources";
import { clip, collapse, decodeEntities, stripTags } from "@/lib/text";
import { httpsImage, imageFromMarkup, openGraphImage } from "@/lib/thumbnails";
import { USER_AGENT, assertPublicHttpUrl, fetchPublicBody, resolvePublicUrl } from "@/lib/url-safety";

const FRESH_MS = 36 * 60 * 60 * 1000;
const FOREIGN_CLIP_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS_PER_SOURCE = 8;

function freshFor(source: Source): number {
  if (source.kind !== "youtube" && (source.format === "video" || source.format === "reel")) return FOREIGN_CLIP_MS;
  return FRESH_MS;
}

export type PublishResult =
  | { status: "created"; slug: string }
  | { status: "duplicate" }
  | { status: "skipped"; reason: string };

type PublishInput = {
  url: string;
  sourceName: string;
  categoryHint?: string;
  format?: ShelfFormat;
  excerptOnly?: boolean;
  isAutomated: boolean;
  authorId?: string | null;
  preset?: {
    title?: string;
    text?: string;
    embedUrl?: string | null;
    sourceUrl?: string;
    thumbnailUrl?: string | null;
  };
};

type FeedItem = {
  title: string;
  link: string;
  summary: string;
  thumbnail?: string;
  videoId?: string;
  seconds?: number;
  shortForm?: boolean;
  playable?: string;
  nativeVideo?: boolean;
  publishedAt?: number;
  views?: number;
  points?: number;
};

type RedditPost = RedditListing & {
  is_self?: boolean;
  created_utc?: number;
};

export async function runIngestionCycle(): Promise<void> {
  console.info("[forge] ingestion started");
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todays = await prisma.post.findMany({
    where: { isAutomated: true, createdAt: { gte: startOfDay } },
    select: { category: true },
  });
  const categoryCounts = new Map<string, number>();
  for (const post of todays) {
    categoryCounts.set(post.category, (categoryCounts.get(post.category) || 0) + 1);
  }
  let created = 0;
  const cooledHosts = new Set<string>();
  const savedNames = new Set(
    (await prisma.post.findMany({ distinct: ["sourceName"], select: { sourceName: true } })).map((post) => post.sourceName),
  );
  const recentCutoff = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const recentUrls = new Set(
    (
      await prisma.scrapeLog.findMany({
        where: { status: ScrapeStatus.SUCCESS, createdAt: { gte: recentCutoff } },
        select: { sourceUrl: true },
      })
    ).map((row) => row.sourceUrl),
  );
  const passes = planDeskPasses(SOURCES, ingestionSlot(), categoryCounts);

  async function collect(
  desk: string,
  sources: Source[],
  limit: number,
  maxReddit = 1,
  countDesk = true,
  perSource = 1,
) {
    let made = 0;
    let redditOnDesk = 0;
    for (const source of sources) {
      if (made >= limit || created >= DAILY_CAP) break;
      if (recentUrls.has(source.url) && savedNames.has(source.sourceName)) continue;
      const host = sourceHost(source.url);
      if (host && cooledHosts.has(host)) continue;
      const bucket = source.categoryHint || desk;
      if (countDesk && (categoryCounts.get(bucket) || 0) >= PER_DESK_PER_DAY) continue;
      const reddit = Boolean(host && (host === "reddit.com" || host.endsWith(".reddit.com")));
      if (reddit && redditOnDesk >= maxReddit) continue;
      if (reddit) redditOnDesk += 1;
      try {
        const result = await ingestSource(source, source.kind === "youtube" ? 1 : perSource);
        made += result.created;
        created += result.created;
        if (result.created > 0) {
          savedNames.add(source.sourceName);
          if (countDesk) categoryCounts.set(bucket, (categoryCounts.get(bucket) || 0) + result.created);
        }
        recentUrls.add(source.url);
        await recordScrape(source.url, "SUCCESS", `published=${result.created} skipped=${result.skipped}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown scrape error";
        if (host && /429|too many requests/i.test(message)) cooledHosts.add(host);
        console.error(`[forge] source failed ${source.url}: ${message}`);
        await recordScrape(source.url, "ERROR", message);
      }
      await sleep(reddit ? 2500 : 1500);
    }
    return made;
  }

  const reelForeign = SOURCES.filter((source) => source.format === "reel" && source.kind !== "youtube");
  const reelYoutube = SOURCES.filter((source) => source.format === "reel" && source.kind === "youtube");
  const foreignReelGoal = Math.min(4, REELS_PER_RUN);
  let reelsMade = await collect("Entertainment", reelForeign, foreignReelGoal, reelForeign.length, false, 2);
  reelsMade += await collect(
    "Entertainment",
    spreadSources(reelYoutube, 12),
    REELS_PER_RUN - reelsMade,
    0,
    false,
  );
  console.info(`[forge] reels published=${reelsMade}`);

  const clipForeign = SOURCES.filter((source) => source.format === "video" && source.kind !== "youtube").sort((a, b) =>
    Number(b.sourceName.startsWith("Vimeo")) - Number(a.sourceName.startsWith("Vimeo")),
  );
  const clipYoutube = SOURCES.filter((source) => source.format === "video" && source.kind === "youtube");
  const foreignClipGoal = Math.min(3, VIDEOS_PER_RUN);
  let clipsMade = await collect("Science", clipForeign, foreignClipGoal, clipForeign.length, false, 2);
  clipsMade += await collect("Science", spreadSources(clipYoutube, 8), VIDEOS_PER_RUN - clipsMade, 0, false);
  console.info(`[forge] videos published=${clipsMade}`);

  for (let deskIndex = 0; deskIndex < DESKS.length; deskIndex += 1) {
    const desk = DESKS[deskIndex] || "";
    const group = (passes[deskIndex] || []).filter((source) => source.format !== "reel" && source.format !== "video");
    if (created >= DAILY_CAP) break;
    const deskSources = SOURCES.filter((source) => source.categoryHint === desk && source.format !== "reel" && source.format !== "video");
    const newcomers = deskSources.filter((source) => !savedNames.has(source.sourceName));
    const quiet = newcomers.filter((source) => !isRedditHost(source.url)).slice(0, 4);
    const newcomerPass = quiet;
    if (group.length === 0) {
      const made = await collect(desk, newcomerPass, newcomerPass.length);
      console.info(`[forge] desk ${desk} filled, new outlets published=${made}`);
      continue;
    }
    const made = await collect(desk, [...newcomerPass, ...spreadSources(group, SOURCES_PER_PASS)], PER_DESK_PER_RUN);
    console.info(`[forge] desk ${desk} published=${made}`);
  }

  try {
    const pruned = await pruneOperationalLogs();
    console.info(
      `[forge] pruned logs=${pruned.logs} links=${pruned.links} sessions=${pruned.sessions}`,
    );
  } catch (error) {
    console.error("[forge] prune failed", error);
  }

  console.info(`[forge] ingestion finished published=${created}`);
}

export async function publishExternalUrl(input: PublishInput): Promise<PublishResult> {
  if (!input.isAutomated) return { status: "skipped", reason: "Submissions are closed." };
  try {
    return await publishInner(input);
  } catch (error) {
    console.error("[forge] skipped item", error instanceof Error ? error.message : error);
    return { status: "skipped", reason: "Could not process item." };
  }
}

async function publishInner(input: PublishInput): Promise<PublishResult> {
  let canonical = await assertPublicHttpUrl(input.preset?.sourceUrl || input.url);
  let embedUrl =
    input.preset?.embedUrl && isAllowedEmbedUrl(input.preset.embedUrl)
      ? input.preset.embedUrl
      : toEmbedUrl(canonical.toString());

  if (!embedUrl && isVideoHost(canonical.toString())) {
    try {
      const resolved = await resolvePublicUrl(canonical.toString());
      canonical = await assertPublicHttpUrl(resolved);
      embedUrl = toEmbedUrl(canonical.toString());
    } catch (error) {
      throw toIngestError(error);
    }
  }

  if (!embedUrl && (isVideoHost(canonical.toString()) || isDirectMedia(canonical.toString()))) {
    return {
      status: "skipped",
      reason: isDirectMedia(canonical.toString())
        ? "Direct media files are not stored."
        : "That video link doesn't expose a supported embed.",
    };
  }

  if (embedUrl) {
    const page = canonicalVideoPage(embedUrl);
    if (page) canonical = await assertPublicHttpUrl(page);
  }

  const existing = await prisma.post.findUnique({
    where: { sourceUrl: canonical.toString() },
    select: { id: true },
  });
  if (existing) return { status: "duplicate" };

  let title = collapseTitle(input.preset?.title || "");
  let text = (input.preset?.text || "").trim();

  if (!input.excerptOnly && !embedUrl && stripTags(text).length < 80) {
    try {
      const page = await fetchPublicBody(canonical.toString(), "article");
      if (page.finalUrl !== canonical.toString()) {
        const duplicate = await prisma.post.findUnique({
          where: { sourceUrl: page.finalUrl },
          select: { id: true },
        });
        if (duplicate) return { status: "duplicate" };
        canonical = await assertPublicHttpUrl(page.finalUrl);
      }
      const article = extractArticle(page.body);
      if (!title) title = collapseTitle(article.title || "");
      if (article.text.length >= 80) text = article.text;
    } catch (error) {
      throw toIngestError(error);
    }
  }

  if (embedUrl && !title) {
    title = collapseTitle((await oEmbedMeta(canonical.toString()))?.title || "");
  }
  if (!title && embedUrl) title = `Video from ${input.sourceName}`;

  const readable = collapse(stripTags(text));
  if (!title || (!embedUrl && !input.excerptOnly && readable.length < 80)) {
    return { status: "skipped", reason: "That page didn't include enough readable text." };
  }

  let opening = leadParagraphs(text, title);
  if (!embedUrl) {
    try {
      const page = await fetchPublicBody(canonical.toString(), "article");
      const fromPage = leadParagraphs(page.body, title);
      if (fromPage.length > opening.length) opening = fromPage;
    } catch {
      // A blocked page still publishes. The open view uses a lead only when one was read.
    }
  }

  const thumbnailUrl = await resolveThumbnail({
    embedUrl,
    pageUrl: canonical.toString(),
    preset: input.preset?.thumbnailUrl,
    markup: text,
  });

  const mixed = remixText({
    title,
    text: readable || title,
    categoryHint: input.categoryHint,
    format: input.format,
  });

  const post = await createPost({
    title,
    sourceUrl: canonical.toString(),
    sourceName: clip(collapse(input.sourceName), 80),
    embedUrl,
    thumbnailUrl,
    category: mixed.category,
    rawContent: null,
    remix: { ...mixed.remix, opening },
    isAutomated: input.isAutomated,
    authorId: input.authorId ?? null,
  });

  return post;
}

async function createPost(input: {
  title: string;
  sourceUrl: string;
  sourceName: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  category: string;
  rawContent: string | null;
  remix: RemixedContent;
  isAutomated: boolean;
  authorId: string | null;
}): Promise<PublishResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const post = await prisma.post.create({
        data: {
          title: input.title,
          slug: slugify(input.title),
          publicId: newPublicId(),
          contentType: input.embedUrl ? "VIDEO_EMBED" : "ARTICLE",
          sourceUrl: input.sourceUrl,
          sourceName: input.sourceName,
          embedUrl: input.embedUrl,
          thumbnailUrl: input.thumbnailUrl,
          category: input.category,
          rawContent: input.rawContent,
          remixedContent: remixToJson(input.remix),
          isAutomated: input.isAutomated,
          authorId: input.authorId,
        },
        select: { slug: true },
      });
      return { status: "created", slug: post.slug };
    } catch (error) {
      if (prismaCode(error) !== "P2002") throw error;
      const target = uniqueTarget(error).toLowerCase();
      if (target.includes("sourceurl") || target.includes("source_url")) {
        return { status: "duplicate" };
      }
      if ((target.includes("slug") || target.includes("publicid") || target.includes("public_id")) && attempt < 2) continue;
      if (!target && attempt < 2) continue;
      return { status: "duplicate" };
    }
  }
  throw new IngestError("Could not publish that link.");
}

async function ingestSource(
  source: Source,
  budget: number,
  options?: { shortsOnly?: boolean },
): Promise<{ created: number; skipped: number }> {
  if (source.kind === "reddit") return ingestReddit(source, budget);
  return ingestXmlFeed(source, budget, options?.shortsOnly);
}

export function ingestPublicSource(source: Source, budget: number) {
  return ingestSource(source, budget);
}

async function ingestReddit(source: Source, budget: number): Promise<{ created: number; skipped: number }> {
  let page: { body: string };
  try {
    page = await fetchPublicBody(source.url, "feed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/429|403|too many requests|forbidden/i.test(message)) throw error;
    return ingestXmlFeed(rssFallback(source), budget, false);
  }
  let payload: { data?: { children?: { data?: RedditPost }[] } };
  try {
    payload = JSON.parse(page.body) as { data?: { children?: { data?: RedditPost }[] } };
  } catch {
    return ingestXmlFeed(rssFallback(source), budget, false);
  }
  const posts = (payload.data?.children || [])
    .map((child) => child.data)
    .filter((post): post is RedditPost => Boolean(post))
    .filter((post) => {
      if (!post.created_utc) return true;
      return Date.now() - post.created_utc * 1000 <= freshFor(source);
    })
    .sort(
      (a, b) =>
        listingScore(b) - listingScore(a) ||
        redditClipRank(b) - redditClipRank(a) ||
        (b.created_utc || 0) - (a.created_utc || 0),
    )
    .slice(0, MAX_ITEMS_PER_SOURCE);

  let created = 0;
  let skipped = 0;
  for (const post of posts) {
    if (created >= budget) break;
    const clip = redditClip(post, source.format);
    if (!clip) {
      skipped += 1;
      continue;
    }
    const result = await publishExternalUrl({
      url: clip.sourceUrl,
      sourceName: source.sourceName,
      categoryHint: source.categoryHint,
      format: clip.format,
      excerptOnly: true,
      isAutomated: true,
      preset: {
        title: clip.title,
        text: clip.text,
        embedUrl: clip.embedUrl,
        sourceUrl: clip.sourceUrl,
        thumbnailUrl: clip.thumbnailUrl,
      },
    });
    if (result.status === "created") created += 1;
    else skipped += 1;
  }
  return { created, skipped };
}

function rssFallback(source: Source): Source {
  const rss = source.url.replace(/\/top\.json(?:\?.*)?$/i, "/top/.rss?t=day");
  return { ...source, kind: "rss", url: rss };
}

async function ingestXmlFeed(
  source: Source,
  budget: number,
  shortsOnly = false,
): Promise<{ created: number; skipped: number }> {
  const page = await fetchPublicBody(source.url, "feed");
  const items = parseFeed(page.body)
    .filter((item) => !item.publishedAt || Date.now() - item.publishedAt <= freshFor(source))
    .sort((a, b) => {
      const heat = feedHeat(b) - feedHeat(a);
      if (heat) return heat;
      if (isRedditHost(source.url)) return 0;
      const rank = source.format === "reel" || source.format === "video" ? clipRank(b) - clipRank(a) : 0;
      return rank || (b.publishedAt || 0) - (a.publishedAt || 0);
    })
    .slice(0, shortsOnly ? 20 : MAX_ITEMS_PER_SOURCE);
  let created = 0;
  let skipped = 0;

  for (const item of items) {
    if (created >= budget) break;
    if (item.publishedAt && Date.now() - item.publishedAt > freshFor(source)) {
      skipped += 1;
      continue;
    }
    const articleUrl = readArticleUrl(item.summary);
    const summary = cleanFeedSummary(item.summary);
    const shortLink = Boolean(item.videoId && (item.shortForm || /\/shorts\//i.test(item.link)));
    const outsideClip =
      item.playable && /tiktok\.com|instagram\.com\/reel|vimeo\.com|\/shorts\//i.test(item.playable)
        ? item.playable
        : null;
    const link = item.videoId
      ? shortLink
        ? `https://www.youtube.com/shorts/${item.videoId}`
        : `https://www.youtube.com/watch?v=${item.videoId}`
      : articleUrl || outsideClip || (isDiscussionLink(item.link) && item.playable) || item.link;
    const outsideHost = /tiktok\.com|instagram\.com|vimeo\.com/i.test(link);
    const embedUrl =
      toEmbedUrl(link) ||
      (!outsideHost && isDiscussionLink(item.link) && item.nativeVideo ? redditVideoEmbed(item.link) : null);
    if (source.kind === "youtube" && !embedUrl) {
      skipped += 1;
      continue;
    }
    if ((source.format === "reel" || source.format === "video") && !embedUrl && !isVideoHost(link)) {
      skipped += 1;
      continue;
    }
    const shortByUrl = /tiktok\.com|instagram\.com\/reel|\/shorts\//i.test(link);
    const shortByTime = Boolean(item.seconds && item.seconds > 0 && item.seconds <= SHORT_FORM_SECONDS);
    const shortClip = shortLink || shortByUrl || shortByTime;
    if (source.format === "reel" && !shortClip) {
      skipped += 1;
      continue;
    }
    if (shortsOnly && !shortClip) {
      skipped += 1;
      continue;
    }
    const format = shelfFormat(source.format, link, shortClip, Boolean(embedUrl));
    const result = await publishExternalUrl({
      url: link,
      sourceName: source.sourceName,
      categoryHint: source.categoryHint,
      format,
      excerptOnly: true,
      isAutomated: true,
      preset: {
        title: source.format === "post" ? item.title.replace(/^\/r\/[A-Za-z0-9_]+[:\s-]*/i, "") : item.title,
        text: summary,
        embedUrl,
        sourceUrl: link,
        thumbnailUrl: item.thumbnail || youtubePoster(link),
      },
    });
    if (result.status === "created") created += 1;
    else skipped += 1;
  }

  return { created, skipped };
}

async function resolveThumbnail(input: {
  embedUrl: string | null;
  pageUrl: string;
  preset?: string | null;
  markup?: string;
}): Promise<string | null> {
  const direct =
    httpsImage(input.preset) ||
    youtubePoster(input.embedUrl) ||
    youtubePoster(input.pageUrl) ||
    imageFromMarkup(input.markup || "");
  if (direct) return direct;
  const embedded = await oEmbedThumbnail(input.pageUrl);
  if (embedded) return embedded;
  if (input.embedUrl) return null;
  try {
    const page = await fetchPublicBody(input.pageUrl, "article");
    return openGraphImage(page.body) || imageFromMarkup(page.body);
  } catch {
    return null;
  }
}

function isDiscussionLink(link: string): boolean {
  try {
    const host = new URL(link).hostname.toLowerCase();
    return host === "reddit.com" || host.endsWith(".reddit.com");
  } catch {
    return false;
  }
}

function feedTime(block: string): number | null {
  const raw = stripTags(
    readTag(block, "published") || readTag(block, "updated") || readTag(block, "pubDate") || readTag(block, "dc:date"),
  );
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstPlayable(block: string): string | null {
  const found = block.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  for (const raw of found) {
    const candidate = decodeEntities(raw).replace(/[),.;\]]+$/, "");
    if (toEmbedUrl(candidate) || /(?:^|\.)tiktok\.com|instagram\.com|vimeo\.com/i.test(candidate)) return candidate;
  }
  return null;
}

function readArticleUrl(summary: string): string | null {
  const match = summary.match(/Article URL:\s*(https?:\/\/\S+)/i);
  return match?.[1] ?? null;
}

function cleanFeedSummary(summary: string): string {
  return summary
    .replace(/Article URL:\s*https?:\/\/\S+/gi, " ")
    .replace(/Comments URL:\s*https?:\/\/\S+/gi, " ")
    .replace(/Points:\s*\d+/gi, " ")
    .replace(/#\s*Comments:\s*\d+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFeed(xml: string): FeedItem[] {
  const chunks = xml.split(/<(?:item|entry)\b[^>]*>/i).slice(1);
  const items: FeedItem[] = [];
  for (const chunk of chunks) {
    const block = chunk.split(/<\/(?:item|entry)>/i)[0] || chunk;
    const title = stripTags(readTag(block, "title"));
    const summary = stripTags(
      readTag(block, "description") ||
        readTag(block, "summary") ||
        readTag(block, "content") ||
        readTag(block, "media:description"),
    );
    const videoId = stripTags(readTag(block, "yt:videoId"));
    const secondsMatch =
      block.match(/<yt:duration\b[^>]*\bseconds=["'](\d+)["']/i) ||
      block.match(/<media:content\b[^>]*\bduration=["'](\d+)["']/i);
    const seconds = secondsMatch ? Number(secondsMatch[1]) : undefined;
    let link = stripTags(readTag(block, "link"));
    if (!/^https?:\/\//i.test(link)) {
      const href = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
      link = href?.[1] ? decodeEntities(href[1]) : "";
    }
    if (!link && videoId) link = `https://www.youtube.com/watch?v=${videoId}`;
    if (!title || !/^https?:\/\//i.test(link)) continue;
    const playable = firstPlayable(block);
    const nativeVideo = /v\.redd\.it|redditmedia\.com/i.test(block);
    const shortForm = /\/shorts\//i.test(block);
    const publishedAt = feedTime(block);
    const views = Number(block.match(/<media:statistics\b[^>]*\bviews=["'](\d+)["']/i)?.[1] || "0");
    const points = Number(stripTags(summary).match(/Points:\s*(\d+)/i)?.[1] || "0");
    const thumbnail =
      imageFromMarkup(block) || (videoId ? youtubePoster(`https://www.youtube.com/watch?v=${videoId}`) : null);
    items.push({
      title,
      link,
      summary,
      thumbnail: thumbnail || undefined,
      videoId: videoId || undefined,
      seconds,
      shortForm,
      playable: playable || undefined,
      nativeVideo,
      publishedAt: publishedAt || undefined,
      views: Number.isFinite(views) ? views : 0,
      points: Number.isFinite(points) ? points : 0,
    });
  }
  return items;
}

function readTag(block: string, tag: string): string {
  const safe = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${safe}\\b[^>]*>([\\s\\S]*?)</${safe}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

async function oEmbedThumbnail(pageUrl: string): Promise<string | null> {
  const meta = await oEmbedMeta(pageUrl);
  return httpsImage(meta?.thumbnailUrl);
}

async function oEmbedMeta(pageUrl: string): Promise<{ title: string | null; thumbnailUrl: string | null } | null> {
  let endpoint: URL;
  try {
    const host = new URL(pageUrl).hostname.toLowerCase();
    if (host.endsWith("youtube.com") || host === "youtu.be") {
      endpoint = new URL("https://www.youtube.com/oembed");
      endpoint.searchParams.set("format", "json");
    } else if (host.endsWith("tiktok.com")) {
      endpoint = new URL("https://www.tiktok.com/oembed");
    } else if (host.endsWith("vimeo.com")) {
      endpoint = new URL("https://vimeo.com/api/oembed.json");
    } else {
      return null;
    }
    endpoint.searchParams.set("url", pageUrl);
  } catch {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { title?: unknown; thumbnail_url?: unknown };
    return {
      title: typeof payload.title === "string" ? payload.title : null,
      thumbnailUrl: typeof payload.thumbnail_url === "string" ? payload.thumbnail_url : null,
    };
  } catch {
    return null;
  }
}

async function recordScrape(sourceUrl: string, status: "SUCCESS" | "ERROR", errorDetails?: string) {
  try {
    await prisma.scrapeLog.create({
      data: {
        sourceUrl,
        status: status === "SUCCESS" ? ScrapeStatus.SUCCESS : ScrapeStatus.ERROR,
        errorDetails: errorDetails ? clip(errorDetails, 2000) : null,
      },
    });
  } catch (error) {
    console.error("[forge] failed to write scrape log", error);
  }
}

function remixToJson(remix: RemixedContent): Prisma.InputJsonValue {
  return {
    tldr: remix.tldr,
    markdown: remix.markdown,
    keywords: [...remix.keywords],
    stats: remix.stats.map((stat) => ({ value: stat.value, label: stat.label })),
    ...(remix.format ? { format: remix.format } : {}),
    ...(remix.opening && remix.opening.length > 0 ? { opening: remix.opening } : {}),
  };
}

function prismaCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) return String((error as { code: unknown }).code);
  return undefined;
}

function uniqueTarget(error: unknown): string {
  if (!error || typeof error !== "object" || !("meta" in error)) return "";
  const target = (error as { meta?: { target?: string[] | string } }).meta?.target;
  if (Array.isArray(target)) return target.join(",");
  return typeof target === "string" ? target : "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sourceHost(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function feedHeat(item: FeedItem): number {
  return item.views || item.points || 0;
}

function clipRank(item: FeedItem): number {
  const blob = `${item.playable || ""} ${item.link}`;
  if (/tiktok\.com|instagram\.com\/reel|\/shorts\//i.test(blob)) return 2;
  if (/vimeo\.com/i.test(blob)) return 1;
  return 0;
}

function isRedditHost(value: string): boolean {
  const host = sourceHost(value);
  return Boolean(host && (host === "reddit.com" || host.endsWith(".reddit.com")));
}
