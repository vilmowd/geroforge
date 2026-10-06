"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MessageCircle, Pause, Play, Share2, Volume2, VolumeX, X } from "lucide-react";
import { ContentPoster } from "@/components/ContentPoster";
import { SiteMark } from "@/components/SiteMark";
import { CommentThread } from "@/components/CommentThread";
import { VoteButton } from "@/components/VoteButton";
import type { CommentNode } from "@/lib/comments";
import { useSharpPicture } from "@/components/useSharpPicture";
import { DigestActions } from "@/components/DigestActions";
import { LeadExcerpt } from "@/components/LeadExcerpt";
import { markExit } from "@/components/mark-exit";
import { SourceFavicon } from "@/components/SourceFavicon";
import { canonicalVideoPage, playbackEmbedSrc, youtubeVideoId } from "@/lib/embed";
import { visibleLead } from "@/lib/html";
import { siteHost } from "@/lib/site-mark";
import { pictureSources } from "@/lib/thumbnails";
import type { FeedCard, FeedFilter } from "@/lib/feed";
import { timeAgo } from "@/lib/format";

export function WatchFeed({
  posts: initialPosts,
  startIndex,
  initialCursor,
  mix,
  filter,
  category,
  authenticated,
  onSeen,
  onClose,
}: {
  posts: FeedCard[];
  startIndex: number;
  initialCursor: string | null;
  mix: string;
  filter: FeedFilter;
  category?: string;
  authenticated: boolean;
  onSeen?: (id: string) => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [active, setActive] = useState(startIndex);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const cursorRef = useRef(initialCursor);
  const loadingRef = useRef(false);
  const advanceAfterLoad = useRef(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const stepRef = useRef<(direction: 1 | -1) => void>(() => undefined);
  const activeRef = useRef(startIndex);
  const postsRef = useRef(posts);
  const commentsRef = useRef(commentsFor);
  const onSeenRef = useRef(onSeen);
  const reportedRef = useRef<string | null>(null);
  activeRef.current = active;
  postsRef.current = posts;
  commentsRef.current = commentsFor;
  onSeenRef.current = onSeen;

  useLayoutEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const align = () => {
      root.scrollTo({ top: startIndex * root.clientHeight });
    };
    align();
    const frame = requestAnimationFrame(align);
    return () => cancelAnimationFrame(frame);
  }, [startIndex]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const slides = [...root.querySelectorAll<HTMLElement>(".watch-slide:not(.watch-more)")];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = slides.indexOf(visible.target as HTMLElement);
        if (index >= 0 && index < postsRef.current.length) setActive(index);
      },
      { root, threshold: 0.65 },
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [posts.length]);

  useEffect(() => {
    const post = posts[active];
    if (!post || reportedRef.current === post.id) return;
    reportedRef.current = post.id;
    onSeenRef.current?.(post.id);
    void fetch("/api/seen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: post.id }),
    });
  }, [active, posts]);

  useEffect(() => {
    if (active < posts.length - 3) return;
    void loadMore();
  }, [active, posts.length]);

  useEffect(() => {
    for (const post of posts.slice(active + 1, active + 2)) {
      const src = post.thumbnailUrl ? pictureSources(post.thumbnailUrl)[0] : "";
      if (!src) continue;
      const image = new Image();
      image.referrerPolicy = "no-referrer";
      image.src = src;
    }
  }, [active, posts]);

  useEffect(() => {
    const post = posts[active];
    const video = Boolean(post && post.embedUrl && (post.format === "video" || post.format === "reel" || post.contentType === "VIDEO_EMBED"));
    if (!post || video || paused || commentsFor) {
      setProgress(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.dataset.motion === "reduce") return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - started) / 12000);
      setProgress(ratio);
      if (ratio >= 1) {
        stepRef.current(1);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, commentsFor, paused, posts]);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const node: HTMLDivElement = root;
    let locked = false;
    function onWheel(event: WheelEvent) {
      if (commentsRef.current) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      if (locked || Math.abs(event.deltaY) < 4) return;
      const direction = event.deltaY > 0 ? 1 : -1;
      const index = activeRef.current;
      const total = postsRef.current.length;
      if (direction < 0 && index <= 0) return;
      if (direction > 0 && index >= total - 1) return;
      locked = true;
      node.scrollBy({ top: direction * node.clientHeight, behavior: "smooth" });
      window.setTimeout(() => {
        locked = false;
      }, 520);
    }
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      stepRef.current(event.key === "ArrowDown" ? 1 : -1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function loadMore() {
    const next = cursorRef.current;
    if (!next || loadingRef.current) {
      if (!next) advanceAfterLoad.current = false;
      return;
    }
    loadingRef.current = true;
    try {
      const params = new URLSearchParams({ cursor: next, mix });
      if (filter !== "all") params.set("filter", filter);
      if (category) params.set("category", category);
      const response = await fetch(`/api/feed?${params.toString()}`);
      if (!response.ok) {
        cursorRef.current = null;
        setCursor(null);
        return;
      }
      const data = (await response.json()) as { posts: FeedCard[]; nextCursor: string | null };
      let added = 0;
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        const incoming = data.posts.filter((post) => !seen.has(post.id));
        added = incoming.length;
        const next = [...current, ...incoming];
        postsRef.current = next;
        return next;
      });
      cursorRef.current = data.nextCursor;
      setCursor(data.nextCursor);
      if (advanceAfterLoad.current && added > 0) {
        advanceAfterLoad.current = false;
        window.requestAnimationFrame(() => step(1));
      } else {
        advanceAfterLoad.current = false;
      }
    } catch {
      cursorRef.current = null;
      setCursor(null);
    } finally {
      loadingRef.current = false;
    }
  }

  function close() {
    if (onClose) onClose();
    else router.push("/");
  }

  function step(direction: 1 | -1) {
    const root = scroller.current;
    if (!root) return;
    const index = activeRef.current;
    const total = postsRef.current.length;
    if (direction < 0 && index <= 0) return;
    if (direction > 0 && index >= total - 1) {
      if (cursorRef.current) {
        advanceAfterLoad.current = true;
        void loadMore();
      }
      return;
    }
    root.scrollTo({ top: (index + direction) * root.clientHeight, behavior: "smooth" });
  }

  stepRef.current = step;
  const nextPost = posts[active + 1] || null;
  const activePost = posts[active] || null;
  const activeIsVideo = Boolean(
    activePost?.embedUrl &&
      (activePost.format === "video" || activePost.format === "reel" || activePost.contentType === "VIDEO_EMBED"),
  );

  const commentPost = posts.find((post) => post.id === commentsFor) || null;

  const reelStage = filter === "reels";

  return (
    <div className={`watch-screen ${reelStage ? "watch-reels" : ""}`}>
      <div ref={scroller} className="watch-scroller">
        {posts.map((post, index) => (
          <WatchSlide
            key={post.id}
            post={post}
            active={index === active}
            authenticated={authenticated}
            onComments={() => setCommentsFor(post.id)}
            soft={reelStage}
          />
        ))}
        {cursor ? <div className="watch-slide watch-more skeleton" aria-hidden="true" /> : null}
      </div>
      {!activeIsVideo ? (
        <div className="absolute left-0 right-0 top-0 z-20 h-1 bg-white/20" aria-hidden="true">
          <span className="block h-full bg-white transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
        </div>
      ) : null}
      <button
        type="button"
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 inline-flex items-center rounded-full bg-black/55 p-2"
        onClick={close}
      >
        <X className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Close</span>
      </button>
      {!activeIsVideo ? (
        <button
          type="button"
          className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 inline-flex items-center rounded-full bg-black/55 p-2"
          aria-pressed={paused}
          aria-label={paused ? "Play" : "Pause"}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
        </button>
      ) : null}
      {nextPost || cursor ? (
        <button
          type="button"
          className="next-chip absolute bottom-[max(0.85rem,env(safe-area-inset-bottom))] left-1/2 z-30 max-w-[calc(100vw-1.5rem)] -translate-x-1/2"
          onClick={() => step(1)}
        >
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate text-sm font-semibold">{nextPost ? nextPost.title : "Next"}</span>
        </button>
      ) : null}
      {commentPost ? (
        <CommentSheet
          post={commentPost}
          authenticated={authenticated}
          onClose={() => setCommentsFor(null)}
        />
      ) : null}
    </div>
  );
}

function WatchSlide({
  post,
  active,
  authenticated,
  onComments,
  soft,
}: {
  post: FeedCard;
  active: boolean;
  authenticated: boolean;
  onComments: () => void;
  soft?: boolean;
}) {
  const video = Boolean(post.embedUrl && (post.format === "video" || post.format === "reel" || post.contentType === "VIDEO_EMBED"));
  const source = safeHttp(post.sourceUrl) || (post.embedUrl ? canonicalVideoPage(post.embedUrl) : null);
  const playerShowsTitle = video;
  const lead = video ? "" : visibleLead(post.opening ?? []);
  const sourceHost = siteHost(post.sourceUrl, post.embedUrl);
  const [likes, setLikes] = useState(post.upvotesCount);

  return (
    <section className="watch-slide relative h-full overflow-hidden bg-black" aria-label={post.title}>
      <div className="absolute inset-0 flex items-center justify-center">
        {video && post.embedUrl && active ? (
          <ReelPlayer
            embedUrl={post.embedUrl}
            title={post.title}
            poster={post.thumbnailUrl ? pictureSources(post.thumbnailUrl)[0] || post.thumbnailUrl : null}
            tall={post.format === "reel"}
            host={siteHost(post.sourceUrl, post.embedUrl)}
            category={post.category}
            format={post.format}
          />
        ) : video ? (
          <FramedStill
            tall={post.format === "reel"}
            src={post.thumbnailUrl}
            title={post.title}
            category={post.category}
            format={post.format}
            host={siteHost(post.sourceUrl, post.embedUrl)}
          />
        ) : post.thumbnailUrl ? (
          <StillImage
            src={post.thumbnailUrl}
            title={post.title}
            category={post.category}
            format={post.format}
            host={siteHost(post.sourceUrl, post.embedUrl)}
          />
        ) : (
          <div className="relative h-full w-full">
            <SiteMark host={siteHost(post.sourceUrl, post.embedUrl)} large>
              <ContentPoster title={post.title} category={post.category} format={post.format} />
            </SiteMark>
          </div>
        )}
      </div>
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end gap-3 bg-gradient-to-t px-4 pb-[calc(4.6rem+env(safe-area-inset-bottom))] pt-16 ${soft ? "from-[#242428] via-[#242428]/80" : "from-black via-black/80"} to-transparent`}>
        <div className="pointer-events-auto min-w-0 flex-1">
          <h2 className={playerShowsTitle ? "sr-only" : "text-lg font-extrabold leading-tight"}>{post.title}</h2>
          {lead ? <LeadExcerpt text={lead} className="mt-2 text-[15px] leading-6 text-white/92" /> : null}
          {source ? (
            <p className="mt-1.5">
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markExit(post.id, post.sourceName)}
                className="inline-flex min-h-9 items-center text-sm font-semibold text-white underline"
              >
                {lead ? "Continue reading" : "Original"}
              </a>
            </p>
          ) : null}
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-white/75">
            {lead ? <SourceFavicon host={sourceHost} /> : null}
            <span className="truncate">
              {post.sourceName}
              <span aria-hidden="true"> · </span>
              {timeAgo(post.createdAt)}
            </span>
          </p>
          <div className="mt-2 max-w-md text-white [&_.text-cream]:text-white [&_.text-mist]:text-white/75 [&_.text-copper]:text-white [&_.bg-white]:bg-white/10">
            <DigestActions post={post} authenticated={authenticated} />
          </div>
          <p className="mt-1 text-xs text-white/75">
            {likes} {likes === 1 ? "like" : "likes"}
            <span aria-hidden="true"> · </span>
            {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
          </p>
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-2.5">
            <VoteButton
              postId={post.id}
              count={post.upvotesCount}
              voted={post.voted}
              authenticated={authenticated}
              returnPath={`/posts/${post.slug}`}
              layout="stack"
              onCount={setLikes}
            />
            <button type="button" className="story-action" aria-label={`${post.commentCount} comments`} onClick={onComments}>
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </button>
            <ShareButton title={post.title} slug={post.slug} />
          </div>
        </div>
    </section>
  );
}

function ShareButton({ title, slug }: { title: string; slug: string }) {
  const [label, setLabel] = useState("Share");

  async function onShare() {
    const url = `${window.location.origin}/posts/${slug}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const field = document.createElement("textarea");
    field.value = url;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    field.remove();
    if (!copied && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (!copied) return;
    setLabel("Copied");
    window.setTimeout(() => setLabel("Share"), 1400);
  }

  return (
    <button
      type="button"
      className="story-action"
      aria-label={label}
      onClick={onShare}
    >
      <Share2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

function FramedStill({
  tall,
  src,
  title,
  category,
  format,
  host,
}: {
  tall: boolean;
  src: string | null;
  title: string;
  category: string;
  format: FeedCard["format"];
  host: string | null;
}) {
  const frame = tall
    ? "relative h-[100dvh] w-[min(100vw,calc(100dvh*9/16))] overflow-hidden bg-black"
    : "relative h-[min(100dvh,calc(100vw*9/16))] w-[min(100vw,calc(100dvh*16/9))] overflow-hidden bg-black";
  return (
    <div className={frame}>
      {src ? (
        <StillImage src={src} title={title} category={category} format={format} host={host} />
      ) : (
        <SiteMark host={host} large>
          <ContentPoster title={title} category={category} format={format} />
        </SiteMark>
      )}
    </div>
  );
}

function StillImage({
  src,
  title,
  category,
  format,
  host,
}: {
  src: string;
  title: string;
  category: string;
  format: FeedCard["format"];
  host: string | null;
}) {
  const picture = useSharpPicture(src);
  const [failed, setFailed] = useState(false);
  if (!picture.src || failed) {
    return (
      <div className="relative h-full w-full">
        <SiteMark host={host} large>
          <ContentPoster title={title} category={category} format={format} />
        </SiteMark>
      </div>
    );
  }
  return (
    <img
      src={picture.src}
      alt=""
      referrerPolicy="no-referrer"
      className="absolute inset-0 h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function ClipSpinner() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center" role="status">
      <span className="sr-only">Loading video</span>
      <span className="clip-spinner" />
    </div>
  );
}

function ReelPlayer({
  embedUrl,
  title,
  poster,
  tall,
  host,
  category,
  format,
}: {
  embedUrl: string;
  title: string;
  poster: string | null;
  tall: boolean;
  host: string | null;
  category: string;
  format: FeedCard["format"];
}) {
  recallPlayback();
  const [muted, setMuted] = useVideosMuted();
  const [shownSrc, setShownSrc] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);
  const armed = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const src = playbackEmbedSrc(embedUrl);
  const ready = Boolean(src) && shownSrc === src;
  const playbackHost = src ? frameHostFrom(src) : "";
  const reportsPlayback = isYouTubeHost(playbackHost) || playbackHost === "player.vimeo.com";
  const waiting = !ready || (reportsPlayback && !started);
  const frame = tall
    ? "h-[100dvh] w-[min(100vw,calc(100dvh*9/16))]"
    : "h-[min(100dvh,calc(100vw*9/16))] w-[min(100vw,calc(100dvh*16/9))]";

  useLayoutEffect(() => {
    return () => {
      parkPlayer();
    };
  }, []);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot || !src) return;
    const player = playerNode();
    if (player.parentElement !== slot) slot.appendChild(player);
    player.title = title;
  });

  useEffect(() => {
    if (!src) return;
    let stopped = false;
    let triedSound = false;
    let unmuteAt = 0;
    let playing = false;
    function playerNow() {
      return stopped ? null : playerNode();
    }
    function onReady() {
      const player = playerNow();
      if (!player || playing) return;
      const id = youtubeVideoId(src);
      setShownSrc(src);
      beginClip(player, id && player.dataset.video !== id ? id : null, mutedRef.current || soundBlocked);
      armed.current = true;
    }
    function onMessage(event: MessageEvent) {
      const player = playerNow();
      if (!player || event.source !== player.contentWindow) return;
      const state = readPlayerState(event);
      if (state === null) return;
      if (state === 3 && armed.current) setStarted(false);
      if (state === 1) {
        playing = true;
        if (armed.current) setStarted(true);
      }
      if (state === 0) {
        sendPlayer(player, "seekTo", [0, true]);
        sendPlayer(player, "playVideo");
        return;
      }
      if (state === 1 && !mutedRef.current && !soundBlocked && !triedSound) {
        triedSound = true;
        unmuteAt = Date.now();
        sendPlayer(player, "unMute");
        sendPlayer(player, "setVolume", [100]);
        return;
      }
      if (triedSound && (state === 2 || state === -1 || state === 5) && Date.now() - unmuteAt < 1800) {
        triedSound = false;
        soundBlocked = true;
        setMuted(true);
        sendPlayer(player, "mute");
        sendPlayer(player, "playVideo");
      }
    }
    window.addEventListener("forge-player-ready", onReady);
    window.addEventListener("message", onMessage);
    const retry = window.setTimeout(() => {
      const player = playerNow();
      if (!player || player.dataset.ready === "1") return;
      onReady();
    }, 900);
    return () => {
      stopped = true;
      window.removeEventListener("forge-player-ready", onReady);
      window.removeEventListener("message", onMessage);
      window.clearTimeout(retry);
    };
  }, [src, setMuted]);

  useEffect(() => {
    if (!src) return;
    setStarted(false);
    armed.current = false;
    const giveUp = window.setTimeout(() => setStarted(true), 8000);
    const player = playerNode();
    const id = youtubeVideoId(src);
    const nextHost = frameHostFrom(src);
    const currentHost = player.src ? frameHost(player) : "";
    const sameYouTube = isYouTubeHost(nextHost) && isYouTubeHost(currentHost);
    if (player.dataset.ready === "1" && id && sameYouTube && player.dataset.video !== id) {
      beginClip(player, id, mutedRef.current || soundBlocked);
      armed.current = true;
      setShownSrc(src);
      return () => window.clearTimeout(giveUp);
    }
    if (player.src !== src) {
      player.dataset.ready = "";
      player.dataset.video = id || "";
      setShownSrc(null);
      player.src = src;
    } else if (player.dataset.ready === "1") {
      beginClip(player, null, true);
      armed.current = true;
      setShownSrc(src);
    }
    return () => window.clearTimeout(giveUp);
  }, [src]);

  function toggleSound() {
    const next = !mutedRef.current;
    soundBlocked = false;
    setMuted(next);
    const player = playerNode();
    if (frameHost(player) === "player.vimeo.com") {
      player.contentWindow?.postMessage({ method: "setVolume", value: next ? 0 : 1 }, "https://player.vimeo.com");
      if (!next) player.contentWindow?.postMessage({ method: "play" }, "https://player.vimeo.com");
      return;
    }
    if (next) {
      sendPlayer(player, "mute");
    } else {
      sendPlayer(player, "setVolume", [100]);
      sendPlayer(player, "unMute");
      sendPlayer(player, "playVideo");
    }
  }

  return (
    <div className={`relative overflow-hidden bg-black ${frame}`}>
      {!ready && (!poster || posterFailed) ? (
        <SiteMark host={host} large>
          <ContentPoster title={title} category={category} format={format} />
        </SiteMark>
      ) : null}
      <div ref={slotRef} className="absolute inset-0" />
      {poster && !posterFailed && !ready ? (
        <img
          src={poster}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 z-[1] h-full w-full object-cover"
          onError={() => setPosterFailed(true)}
        />
      ) : null}
      {waiting ? <ClipSpinner /> : null}
      {src ? (
        <button
          type="button"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2"
          aria-label={muted ? "Turn sound on" : "Mute"}
          onClick={toggleSound}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      ) : null}
    </div>
  );
}

let videosMuted = false;
let soundBlocked = false;
let sharedPlayer: HTMLIFrameElement | null = null;
const muteListeners = new Set<(muted: boolean) => void>();

export function armPlayback() {
  videosMuted = false;
  soundBlocked = false;
  try {
    sessionStorage.setItem("forge_sound", String(Date.now()));
  } catch {
    // Private browsing can block storage. The open tap still counts in this page.
  }
  muteListeners.forEach((listener) => listener(false));
}

function recallPlayback() {
  try {
    const raw = sessionStorage.getItem("forge_sound");
    if (!raw) return;
    sessionStorage.removeItem("forge_sound");
    if (Date.now() - Number(raw) < 10000) {
      videosMuted = false;
      soundBlocked = false;
    }
  } catch {
    // Ignore storage failures.
  }
}

function playerNode(): HTMLIFrameElement {
  if (sharedPlayer) return sharedPlayer;
  const frame = document.createElement("iframe");
  frame.className = "absolute inset-0 h-full w-full bg-black";
  frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
  frame.allowFullscreen = true;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.addEventListener("load", () => {
    frame.dataset.ready = "1";
    window.dispatchEvent(new Event("forge-player-ready"));
  });
  sharedPlayer = frame;
  return frame;
}

function parkPlayer() {
  if (!sharedPlayer) return;
  let park = document.getElementById("forge-player-park");
  if (!park) {
    park = document.createElement("div");
    park.id = "forge-player-park";
    park.hidden = true;
    document.body.appendChild(park);
  }
  park.appendChild(sharedPlayer);
  sendPlayer(sharedPlayer, "pauseVideo");
}

function beginClip(frame: HTMLIFrameElement, videoId: string | null, startMuted: boolean) {
  const host = frameHost(frame);
  if (isYouTubeHost(host)) {
    frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
    if (videoId) {
      frame.dataset.video = videoId;
      sendPlayer(frame, "loadVideoById", [{ videoId, startSeconds: 0 }]);
    }
    if (startMuted) sendPlayer(frame, "mute");
    else {
      sendPlayer(frame, "unMute");
      sendPlayer(frame, "setVolume", [100]);
    }
    sendPlayer(frame, "playVideo");
    return;
  }
  if (host === "player.vimeo.com") {
    frame.contentWindow?.postMessage({ method: "setVolume", value: startMuted ? 0 : 1 }, "https://player.vimeo.com");
    frame.contentWindow?.postMessage({ method: "play" }, "https://player.vimeo.com");
  }
}

function useVideosMuted() {
  const [muted, setMuted] = useState(videosMuted);
  useEffect(() => {
    const onChange = (value: boolean) => setMuted(value);
    muteListeners.add(onChange);
    return () => {
      muteListeners.delete(onChange);
    };
  }, []);
  const update = useCallback((value: boolean) => {
    videosMuted = value;
    muteListeners.forEach((listener) => listener(value));
  }, []);
  return [muted, update] as const;
}

function frameHost(frame: HTMLIFrameElement): string {
  return frameHostFrom(frame.src);
}

function frameHostFrom(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function isYouTubeHost(host: string): boolean {
  return host === "www.youtube.com" || host === "www.youtube-nocookie.com";
}

function readPlayerState(event: MessageEvent): number | null {
  if (event.origin === "https://player.vimeo.com") {
    const data = event.data as { event?: string } | null;
    if (data?.event === "play") return 1;
    if (data?.event === "pause") return 2;
    if (data?.event === "ended") return 0;
    return null;
  }
  let data: { event?: string; info?: unknown } | null = null;
  if (typeof event.data === "string") {
    try {
      data = JSON.parse(event.data) as { event?: string; info?: unknown };
    } catch {
      return null;
    }
  } else if (event.data && typeof event.data === "object") {
    data = event.data as { event?: string; info?: unknown };
  }
  if (!data?.event || data.event === "onReady") return null;
  const delivered =
    data.event === "infoDelivery" && data.info && typeof data.info === "object"
      ? (data.info as { playerState?: unknown }).playerState
      : undefined;
  const state = data.event === "onStateChange" ? Number(data.info) : Number(delivered);
  return Number.isInteger(state) ? state : null;
}

function sendPlayer(
  frame: HTMLIFrameElement | null,
  func: "mute" | "unMute" | "playVideo" | "pauseVideo" | "setVolume" | "loadVideoById" | "seekTo",
  args: unknown[] = [],
) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

function CommentSheet({
  post,
  authenticated,
  onClose,
}: {
  post: FeedCard;
  authenticated: boolean;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentNode[] | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setComments(null);
    void fetch(`/api/posts/${post.slug}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { comments?: CommentNode[] } | null) => {
        if (!cancelled) setComments(data?.comments || []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [post.slug, version]);

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="sheet-up max-h-[78dvh] w-full overflow-y-auto rounded-t-3xl bg-white px-4 pb-8 pt-4 text-cream"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Comments</h2>
          <button type="button" className="text-sm font-semibold" onClick={onClose}>
            Close
          </button>
        </div>
        {comments ? (
          <CommentThread
            postId={post.id}
            returnPath={`/posts/${post.slug}`}
            authenticated={authenticated}
            comments={comments}
            embedded
            onRefresh={refresh}
          />
        ) : (
          <div className="space-y-3 py-4" aria-hidden="true">
            <div className="skeleton h-4 w-2/3 rounded-full" />
            <div className="skeleton h-4 w-full rounded-full" />
            <div className="skeleton h-4 w-5/6 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

function safeHttp(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}
