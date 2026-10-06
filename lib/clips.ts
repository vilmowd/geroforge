import { redditVideoEmbed, toEmbedUrl } from "@/lib/embed";
import type { ShelfFormat } from "@/lib/remixer";

export type RedditListing = {
  title?: string;
  url?: string;
  permalink?: string;
  selftext?: string;
  is_video?: boolean;
  over_18?: boolean;
  stickied?: boolean;
  post_hint?: string;
  domain?: string;
  thumbnail?: string;
  preview?: { images?: { source?: { url?: string } }[] };
  score?: number;
  ups?: number;
};

export type RedditClip = {
  title: string;
  text: string;
  sourceUrl: string;
  embedUrl: string;
  thumbnailUrl: string | null;
  format: ShelfFormat;
};

export const SHORT_FORM_SECONDS = 180;

export function shelfFormat(sourceFormat: ShelfFormat, link: string, shortClip: boolean, embedded: boolean): ShelfFormat {
  if (/tiktok\.com|instagram\.com\/reel|\/shorts\//i.test(link) || shortClip) return "reel";
  if (sourceFormat === "reel" && embedded) return "reel";
  if (embedded && (sourceFormat === "post" || sourceFormat === "article" || sourceFormat === "video")) return "video";
  if (!embedded && sourceFormat === "video" && /reddit\.com/i.test(link)) return "post";
  if (sourceFormat === "reel") return "post";
  return sourceFormat;
}

export function redditClip(post: RedditListing, sourceFormat: ShelfFormat): RedditClip | null {
  if (!post.title || !post.permalink || post.stickied || post.over_18) return null;
  const permalink = `https://www.reddit.com${post.permalink.startsWith("/") ? post.permalink : `/${post.permalink}`}`;
  const outbound = post.url || "";
  const native = Boolean(post.is_video || post.post_hint === "hosted:video" || post.domain === "v.redd.it");
  const outboundEmbed = outbound ? toEmbedUrl(outbound) : null;
  const longYouTube = /(?:youtube\.com\/watch|youtu\.be\/)/i.test(outbound) && !/\/shorts\//i.test(outbound);
  if (sourceFormat === "reel" && longYouTube) return null;
  const embedUrl = outboundEmbed || (native ? redditVideoEmbed(permalink) : null);
  if (!embedUrl) return null;
  const sourceUrl = outboundEmbed ? outbound : permalink;
  const shortClip =
    !longYouTube &&
    (sourceFormat === "reel" || native || /\/shorts\/|tiktok\.com|instagram\.com\/reel/i.test(`${sourceUrl} ${outbound}`));
  return {
    title: post.title,
    text: post.selftext || "",
    sourceUrl,
    embedUrl,
    thumbnailUrl: redditThumb(post),
    format: shelfFormat(sourceFormat, sourceUrl, shortClip, true),
  };
}

export function listingScore(post: RedditListing): number {
  const score = post.score ?? post.ups ?? 0;
  return Number.isFinite(score) && score > 0 ? score : 0;
}

export function redditClipRank(post: RedditListing): number {
  const url = post.url || "";
  if (/tiktok\.com|instagram\.com\/reel|\/shorts\//i.test(url)) return 3;
  if (post.is_video || post.domain === "v.redd.it" || post.post_hint === "hosted:video") return 2;
  if (toEmbedUrl(url)) return 1;
  return 0;
}

function redditThumb(post: RedditListing): string | null {
  const preview = (post.preview?.images?.[0]?.source?.url || "").replace(/&amp;/g, "&");
  if (preview.startsWith("https://")) return preview;
  if (post.thumbnail?.startsWith("https://")) return post.thumbnail;
  return null;
}
