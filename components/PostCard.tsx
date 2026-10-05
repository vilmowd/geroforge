"use client";

import { useState } from "react";
import Link from "next/link";
import { Clapperboard, Globe2, MessagesSquare, Newspaper, Play, ScrollText } from "lucide-react";
import { ContentPoster } from "@/components/ContentPoster";
import { SiteMark } from "@/components/SiteMark";
import { canonicalVideoPage } from "@/lib/embed";
import { siteHost } from "@/lib/site-mark";
import { cardPicture } from "@/lib/thumbnails";
import type { FeedCard } from "@/lib/feed";
import { timeAgo } from "@/lib/format";
import type { ShelfFormat } from "@/lib/remixer";

const LABEL: Record<ShelfFormat, string> = {
  video: "Video",
  reel: "Reel",
  news: "News",
  world: "World",
  article: "Article",
  post: "Post",
};

export function PostCard({
  post,
  onOpen,
  index = 0,
  className = "",
}: {
  post: FeedCard;
  onOpen?: () => void;
  index?: number;
  className?: string;
}) {
  const format = post.format;
  const modest = cardPicture(post.thumbnailUrl);
  const [src, setSrc] = useState(modest || "");
  const [phase, setPhase] = useState<"loading" | "ready" | "missing">(modest ? "loading" : "missing");
  const Icon =
    format === "news"
      ? Newspaper
      : format === "world"
        ? Globe2
        : format === "article"
          ? ScrollText
          : format === "post"
            ? MessagesSquare
            : Clapperboard;
  const play = format === "video" || format === "reel";
  const original = originalHref(post);
  const waiting = phase === "loading";
  const eager = index < 4;
  const frame = cardFrame(post);

  return (
    <article
      className={`feed-card post-widget relative flex w-full flex-col overflow-hidden rounded-[22px] bg-white text-cream shadow-card max-sm:active:scale-[0.985] sm:rounded-[28px] ${className}`}
      style={{ animationDelay: `${(index % 8) * 50}ms` }}
      aria-busy={waiting}
    >
      <Link
        href={`/posts/${post.slug}`}
        aria-label={post.title}
        onClick={(event) => {
          if (!onOpen || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          onOpen();
        }}
        className="absolute inset-0 z-10"
      />
      <div className={`relative w-full overflow-hidden bg-black ${frame}`}>
        {waiting ? <span className="skeleton pointer-events-none absolute inset-0 z-0" /> : null}
        {phase === "missing" ? (
          <SiteMark host={siteHost(post.sourceUrl, post.embedUrl)}>
            <ContentPoster title={post.title} category={post.category} format={format} decorative />
          </SiteMark>
        ) : null}
        {phase !== "missing" && src ? (
          <img
            src={src}
            alt=""
            width={480}
            height={270}
            decoding="async"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={index < 2 ? "high" : "low"}
            referrerPolicy="no-referrer"
            className={`absolute inset-0 h-full w-full object-cover ${phase === "ready" ? "photo-live opacity-100" : "opacity-0"}`}
            onLoad={() => setPhase("ready")}
            onError={() => {
              if (post.thumbnailUrl && src !== post.thumbnailUrl) {
                setSrc(post.thumbnailUrl);
                setPhase("loading");
                return;
              }
              setPhase("missing");
            }}
          />
        ) : null}
        {play ? (
          <span className="pointer-events-none absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white">
            <Play className="h-3.5 w-3.5 fill-white" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="flex w-full min-w-0 flex-col gap-2 p-3.5">
        <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-copper/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-copper">
          <Icon className="h-3 w-3" aria-hidden="true" />
          {LABEL[format]}
        </span>
        <div className="min-w-0">
          <h2 className="line-clamp-2 break-words text-[1.05rem] font-extrabold leading-tight tracking-tight text-cream sm:text-sm sm:leading-snug">
            {post.title}
          </h2>
          <p className="mt-1.5 truncate text-[12px] font-medium text-mist sm:text-[11px]">
            {post.sourceName}
            <span aria-hidden="true"> · </span>
            {timeAgo(post.createdAt)}
          </p>
          {original ? (
            <a
              href={original}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="relative z-20 mt-1 inline-flex min-h-11 max-w-full items-center truncate text-xs font-bold text-copper underline sm:min-h-0 sm:py-1"
            >
              Original
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const VIDEO_FRAMES = ["aspect-video", "aspect-video", "aspect-[4/3]", "aspect-[16/10]"] as const;
const STORY_FRAMES = ["aspect-[4/5]", "aspect-square", "aspect-[5/4]", "aspect-[16/10]", "aspect-[3/4]"] as const;

export function cardFrame(post: FeedCard): string {
  if (post.format === "reel") return "aspect-[3/4]";
  const frames = post.format === "video" ? VIDEO_FRAMES : STORY_FRAMES;
  return frames[stableIndex(post.id, frames.length)];
}

export function cardWeight(post: FeedCard): number {
  const frame = cardFrame(post);
  const image =
    frame === "aspect-[3/4]" || frame === "aspect-[4/5]" ? 460 : frame === "aspect-square" ? 360 : frame === "aspect-[5/4]" ? 300 : 240;
  return image + (post.title.length > 42 ? 108 : 88);
}

function stableIndex(value: string, size: number): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  return hash % size;
}

function originalHref(post: FeedCard): string | null {
  const direct = httpUrl(post.sourceUrl);
  if (direct) return direct;
  return post.embedUrl ? canonicalVideoPage(post.embedUrl) : null;
}

function httpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}
