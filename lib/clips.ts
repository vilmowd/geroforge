import { isDirectMedia, isVideoHost, redditVideoEmbed, toEmbedUrl } from "@/lib/embed";
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
  media?: { reddit_video?: unknown };
  secure_media?: { reddit_video?: unknown };
  score?: number;
  ups?: number;
};

export type RedditClip = {
  title: string;
  text: string;
  sourceUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  format: ShelfFormat;
};

export const SHORT_FORM_SECONDS = 60;

export function shelfFormat(sourceFormat: ShelfFormat, link: string, shortClip: boolean, embedded: boolean): ShelfFormat {
  if (/tiktok\.com|instagram\.com\/reel|\/shorts\//i.test(link) || shortClip) return "reel";
  if (embedded && (sourceFormat === "post" || sourceFormat === "article" || sourceFormat === "video" || sourceFormat === "reel")) return "video";
  if (!embedded && sourceFormat === "video" && /reddit\.com/i.test(link)) return "post";
  if (sourceFormat === "reel") return "post";
  return sourceFormat;
}

export function redditClip(post: RedditListing, sourceFormat: ShelfFormat): RedditClip | null {
  if (!post.title || !post.permalink || post.stickied || post.over_18) return null;
  const permalink = `https://www.reddit.com${post.permalink.startsWith("/") ? post.permalink : `/${post.permalink}`}`;
  const outbound = post.url || "";
  const native = Boolean(
    post.is_video ||
      post.post_hint === "hosted:video" ||
      post.domain === "v.redd.it" ||
      post.media?.reddit_video ||
      post.secure_media?.reddit_video,
  );
  const outboundEmbed = outbound ? toEmbedUrl(outbound) : null;
  const longYouTube = /(?:youtube\.com\/watch|youtu\.be\/)/i.test(outbound) && !/\/shorts\//i.test(outbound);
  if (sourceFormat === "reel" && longYouTube) return null;
  const needsResolve = !outboundEmbed && isVideoHost(outbound) && !isDirectMedia(outbound);
  const embedUrl = outboundEmbed || (native ? redditVideoEmbed(permalink) : null);
  if (!embedUrl && !needsResolve) return null;
  const sourceUrl = outboundEmbed || needsResolve ? outbound : permalink;
  const shortClip =
    /\/shorts\/|tiktok\.com|instagram\.com\/reel/i.test(`${sourceUrl} ${outbound}`) ||
    (sourceFormat === "reel" && native);
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
