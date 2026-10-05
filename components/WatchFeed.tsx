"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MessageCircle, Pause, Play, Share2, Volume2, VolumeX, X } from "lucide-react";
import { ContentPoster } from "@/components/ContentPoster";
import { CommentThread } from "@/components/CommentThread";
import { VoteButton } from "@/components/VoteButton";
import type { CommentNode } from "@/lib/comments";
import { useSharpPicture } from "@/components/useSharpPicture";
import { canonicalVideoPage, playbackEmbedSrc } from "@/lib/embed";
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

  return (
    <div className="watch-screen">
      <div ref={scroller} className="watch-scroller">
        {posts.map((post, index) => (
          <WatchSlide
            key={post.id}
            post={post}
            active={index === active}
            authenticated={authenticated}
            onComments={() => setCommentsFor(post.id)}
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
}: {
  post: FeedCard;
  active: boolean;
  authenticated: boolean;
  onComments: () => void;
}) {
  const video = Boolean(post.embedUrl && (post.format === "video" || post.format === "reel" || post.contentType === "VIDEO_EMBED"));
  const source = safeHttp(post.sourceUrl) || (post.embedUrl ? canonicalVideoPage(post.embedUrl) : null);
  const playerShowsTitle = video;
  const note = readingNote(post);
  const [likes, setLikes] = useState(post.upvotesCount);

  return (
    <section className="watch-slide relative h-full overflow-hidden bg-black" aria-label={post.title}>
      <div className={`absolute inset-0 flex items-center justify-center ${active ? "watch-copy is-on" : ""}`}>
        {video && post.embedUrl ? (
          <ReelPlayer
            embedUrl={post.embedUrl}
            title={post.title}
            poster={post.thumbnailUrl ? pictureSources(post.thumbnailUrl)[0] || post.thumbnailUrl : null}
            active={active}
            tall={post.format === "reel"}
          />
        ) : post.thumbnailUrl ? (
          <StillImage src={post.thumbnailUrl} title={post.title} category={post.category} format={post.format} />
        ) : (
          <div className="relative h-full w-full">
            <ContentPoster title={post.title} category={post.category} format={post.format} />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end gap-3 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-[calc(4.6rem+env(safe-area-inset-bottom))] pt-16">
        <div className="pointer-events-auto min-w-0 flex-1">
          <h2 className={playerShowsTitle ? "sr-only" : "text-lg font-extrabold leading-tight"}>{post.title}</h2>
          {note ? <p className="mt-2 line-clamp-4 text-[15px] leading-6 text-white/92">{note}</p> : null}
          {source ? (
            <p className="mt-1.5">
              <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center text-sm font-semibold text-white underline">
                {note ? "Continue reading" : "Original"}
              </a>
            </p>
          ) : null}
          <p className="mt-1 truncate text-xs text-white/75">
            {post.sourceName}
            <span aria-hidden="true"> · </span>
            {timeAgo(post.createdAt)}
          </p>
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

function StillImage({
  src,
  title,
  category,
  format,
}: {
  src: string;
  title: string;
  category: string;
  format: FeedCard["format"];
}) {
  const picture = useSharpPicture(src);
  if (picture.phase === "missing" || !picture.src) {
    return (
      <div className="relative h-full w-full">
        <ContentPoster title={title} category={category} format={format} />
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      {picture.phase === "loading" ? <span className="skeleton absolute inset-0" /> : null}
      <img
        key={picture.src}
        ref={picture.ref}
        src={picture.src}
        alt=""
        referrerPolicy="no-referrer"
        className={`absolute inset-0 h-full w-full object-cover ${picture.phase === "ready" ? "opacity-100" : "opacity-0"}`}
        onLoad={picture.onLoad}
        onError={picture.onError}
      />
    </div>
  );
}

function ReelPlayer({
  embedUrl,
  title,
  poster,
  active,
  tall,
}: {
  embedUrl: string;
  title: string;
  poster: string | null;
  active: boolean;
  tall: boolean;
}) {
  const [muted, setMuted] = useVideosMuted();
  const [ready, setReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const mutedRef = useRef(muted);
  const kickRef = useRef<() => void>(() => {});
  mutedRef.current = muted;
  const src = active ? playbackEmbedSrc(embedUrl) : null;
  const frame = tall
    ? "h-[100dvh] w-[min(100vw,calc(100dvh*9/16))]"
    : "h-[min(100dvh,calc(100vw*9/16))] w-[min(100vw,calc(100dvh*16/9))]";

  useEffect(() => {
    setReady(false);
  }, [src]);

  useEffect(() => {
    if (!src) return;
    let stopped = false;
    function kick() {
      if (stopped) return;
      const player = frameRef.current;
      if (!player?.contentWindow) return;
      const host = frameHost(player);
      if (host === "www.youtube.com" || host === "www.youtube-nocookie.com") {
        player.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
        sendPlayer(player, "playVideo");
        if (mutedRef.current) {
          sendPlayer(player, "mute");
        } else {
          sendPlayer(player, "setVolume", [100]);
          sendPlayer(player, "unMute");
        }
        return;
      }
      if (host === "player.vimeo.com") {
        player.contentWindow.postMessage({ method: "play" }, "https://player.vimeo.com");
        player.contentWindow.postMessage({ method: "setVolume", value: mutedRef.current ? 0 : 1 }, "https://player.vimeo.com");
      }
    }
    kickRef.current = kick;
    const timers = [0, 400, 1000, 1800, 3000].map((delay) => window.setTimeout(kick, delay));
    return () => {
      stopped = true;
      kickRef.current = () => {};
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [src]);

  function toggleSound() {
    const next = !mutedRef.current;
    setMuted(next);
    const player = frameRef.current;
    if (!player) return;
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
      {!ready ? (
        <>
          {poster ? <img src={poster} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <span className="skeleton absolute inset-0 opacity-80" />
        </>
      ) : null}
      {src ? (
        <iframe
          ref={frameRef}
          key={src}
          src={src}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => {
            setReady(true);
            kickRef.current();
          }}
        />
      ) : null}
      {src && active ? (
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
const muteListeners = new Set<(muted: boolean) => void>();

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

function readingNote(post: FeedCard): string | null {
  if (post.format === "video" || post.format === "reel") return null;
  const note = post.tldr?.trim() || "";
  if (note.length < 40 || note === post.title) return null;
  return note;
}

function frameHost(frame: HTMLIFrameElement): string {
  try {
    return new URL(frame.src).hostname;
  } catch {
    return "";
  }
}

function sendPlayer(frame: HTMLIFrameElement | null, func: "mute" | "unMute" | "playVideo" | "setVolume", args: unknown[] = []) {
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
