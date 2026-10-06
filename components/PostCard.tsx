"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clapperboard, Globe2, MessagesSquare, Newspaper, Play, ScrollText } from "lucide-react";
import { chooseDoor } from "@/app/actions/loops";
import { ContentPoster } from "@/components/ContentPoster";
import { DigestActions } from "@/components/DigestActions";
import { LeadExcerpt } from "@/components/LeadExcerpt";
import { SourceFavicon } from "@/components/SourceFavicon";
import { markExit } from "@/components/mark-exit";
import { SiteMark } from "@/components/SiteMark";
import { armPlayback } from "@/components/WatchFeed";
import { canonicalVideoPage } from "@/lib/embed";
import { siteHost } from "@/lib/site-mark";
import { cardPicture } from "@/lib/thumbnails";
import type { FeedCard } from "@/lib/feed";
import { timeAgo } from "@/lib/format";
import { visibleLead } from "@/lib/html";
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
  readMode = false,
  authenticated = false,
}: {
  post: FeedCard;
  onOpen?: () => void;
  index?: number;
  className?: string;
  readMode?: boolean;
  authenticated?: boolean;
}) {
  const format = post.format;
  const modest = cardPicture(post.thumbnailUrl);
  const [src, setSrc] = useState(modest || "");
  const [phase, setPhase] = useState<"loading" | "ready" | "missing">(modest ? "loading" : "missing");
  const photoRef = useRef<HTMLImageElement>(null);
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
  const readable = !play;
  const original = originalHref(post);
  const waiting = phase === "loading";
  const eager = index < 4;
  const frame = cardFrame(post);

  useEffect(() => {
    const image = photoRef.current;
    if (!image?.complete) return;
    if (image.naturalWidth > 0) setPhase("ready");
    else setPhase("missing");
  }, [src]);

  if (post.door || (readMode && readable)) {
    return (
      <article
        className={`feed-card post-widget relative flex w-full flex-col overflow-hidden rounded-[22px] bg-white text-cream shadow-card sm:rounded-[28px] ${className}`}
        style={{ animationDelay: `${(index % 8) * 50}ms` }}
      >
        {post.door ? <DoorBoard post={post} onOpen={onOpen} /> : <ReadFace post={post} onOpen={onOpen} />}
        <div className="flex flex-col gap-2 px-3.5 pb-3.5">
          <DigestActions post={post} authenticated={authenticated} />
        </div>
      </article>
    );
  }

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
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          armPlayback();
          if (!onOpen) return;
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
            ref={photoRef}
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
              onClick={(event) => {
                event.stopPropagation();
                markExit(post.id, post.sourceName);
              }}
              className="relative z-20 mt-1 inline-flex min-h-11 max-w-full items-center truncate text-xs font-bold text-copper underline sm:min-h-0 sm:py-1"
            >
              Original
            </a>
          ) : null}
        </div>
        <DigestActions post={post} authenticated={authenticated} />
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

export function cardWeight(post: FeedCard, readMode = false): number {
  if (post.door) return 320;
  if (readMode && post.format !== "video" && post.format !== "reel") return 292;
  const frame = cardFrame(post);
  const image =
    frame === "aspect-[3/4]" || frame === "aspect-[4/5]" ? 460 : frame === "aspect-square" ? 360 : frame === "aspect-[5/4]" ? 300 : 240;
  return image + (post.title.length > 42 ? 108 : 88);
}

function ReadFace({ post, onOpen }: { post: FeedCard; onOpen?: () => void }) {
  const original = originalHref(post);
  const lead = visibleLead(post.opening ?? []);
  return (
    <div className="flex flex-col gap-2 p-3.5 pb-2">
      <div className="flex items-center gap-2">
        <SourceFavicon host={siteHost(post.sourceUrl, post.embedUrl)} />
        <p className="min-w-0 truncate text-xs font-semibold text-mist">{post.sourceName}</p>
      </div>
      <p className="text-sm font-extrabold leading-snug text-cream">{post.title}</p>
      {lead ? <LeadExcerpt text={lead} className="text-[15px] leading-6 text-cream" /> : null}
      <p className="text-xs text-mist">{timeAgo(post.createdAt)}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn min-h-9 px-3 py-1 text-xs" onClick={() => onOpen?.()}>
          Open
        </button>
        {original ? (
          <a
            href={original}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => markExit(post.id, post.sourceName)}
            className="btn-ghost min-h-9 px-3 py-1 text-xs"
          >
            {lead ? "Continue reading" : "Original"}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function DoorBoard({ post, onOpen }: { post: FeedCard; onOpen?: () => void }) {
  const door = post.door;
  if (!door) return null;
  return (
    <div className="grid sm:grid-cols-2">
      <DoorSide
        title={post.title}
        line={visibleLead(post.opening ?? []) || null}
        host={siteHost(post.sourceUrl, post.embedUrl)}
        sourceName={post.sourceName}
        href={originalHref(post)}
        postId={post.id}
        otherId={door.id}
        onOpen={onOpen}
      />
      <DoorSide
        title={door.title}
        line={door.line}
        host={siteHost(door.sourceUrl, null)}
        sourceName={door.sourceName}
        href={httpUrl(door.sourceUrl)}
        postId={door.id}
        otherId={post.id}
        openHref={`/posts/${door.slug}`}
      />
    </div>
  );
}

function DoorSide({
  title,
  line,
  host,
  sourceName,
  href,
  postId,
  otherId,
  onOpen,
  openHref,
}: {
  title: string;
  line: string | null;
  host: string | null;
  sourceName: string;
  href: string | null;
  postId: string;
  otherId: string;
  onOpen?: () => void;
  openHref?: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-line p-3.5 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-copper">Two doors</p>
      <p className="text-sm font-extrabold leading-snug text-cream">{title}</p>
      {line ? <LeadExcerpt text={line} className="text-sm leading-5 text-mist" /> : null}
      <p className="flex items-center gap-1.5 text-xs font-medium text-mist">
        <SourceFavicon host={host} />
        <span className="min-w-0 truncate">{sourceName}</span>
      </p>
      <div className="mt-auto flex flex-wrap gap-2">
        {onOpen ? (
          <button type="button" className="btn min-h-9 px-3 py-1 text-xs" onClick={() => onOpen()}>
            Open
          </button>
        ) : openHref ? (
          <Link href={openHref} className="btn min-h-9 px-3 py-1 text-xs">
            Open
          </Link>
        ) : null}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              markExit(postId, sourceName);
              void chooseDoor(postId, otherId);
            }}
            className="btn-ghost min-h-9 px-3 py-1 text-xs"
          >
            This source
          </a>
        ) : null}
      </div>
    </div>
  );
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
