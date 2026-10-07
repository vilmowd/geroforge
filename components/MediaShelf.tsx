"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { cardWeight, PostCard } from "@/components/PostCard";
import { writeShelfCache } from "@/components/shelf-cache";
import { SkeletonCard } from "@/components/SkeletonCard";
import { armPlayback, WatchFeed } from "@/components/WatchFeed";
import { useWatch } from "@/components/WatchSession";
import type { FeedCard, FeedFilter } from "@/lib/feed";

function subscribeColumns(onStoreChange: () => void) {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

function columnCount() {
  if (window.innerWidth >= 1024) return 4;
  if (window.innerWidth >= 640) return 2;
  return 1;
}

function useColumnCount() {
  return useSyncExternalStore(subscribeColumns, columnCount, () => 1);
}

export function MediaShelf({
  initialPosts,
  initialCursor,
  filter,
  category,
  mix,
  authenticated,
  caughtUp = false,
}: {
  initialPosts: FeedCard[];
  initialCursor: string | null;
  filter: FeedFilter;
  category?: string;
  mix: string;
  authenticated: boolean;
  caughtUp?: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const freshKey = initialPosts.map((post) => `${post.id}:${post.offers?.length ?? 0}:${post.roomLine ?? ""}:${post.passedBy ?? ""}:${post.door?.id ?? ""}`).join("|");
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [shelfMix, setShelfMix] = useState(mix);
  const [loading, setLoading] = useState(false);
  const [watching, setWatching] = useState<number | null>(null);
  const [queue, setQueue] = useState<FeedCard[] | null>(null);
  const watch = useWatch();
  const noteSeenRef = useRef<(id: string) => void>(() => undefined);
  const cursorRef = useRef(initialCursor);
  const loadingRef = useRef(false);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const prefetchRef = useRef<{ cursor: string; promise: Promise<{ posts: FeedCard[]; nextCursor: string | null }> } | null>(null);
  const measuredRef = useRef(new Map<string, number>());
  const laneRef = useRef(new Map<string, number>());
  const lockedRef = useRef(new Set<string>());
  const columnRef = useRef(1);
  const cardRef = useRef(new Map<string, HTMLDivElement>());
  const [packEpoch, setPackEpoch] = useState(0);
  const [readMode, setReadMode] = useState(false);

  useEffect(() => {
    writeShelfCache(filter, category, { mix, posts: initialPosts.slice(0, 30), cursor: initialCursor });
  }, [category, filter, freshKey, initialCursor, initialPosts, mix]);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialCursor);
    cursorRef.current = initialCursor;
    prefetchRef.current = null;
  }, [freshKey, initialCursor]);

  useEffect(() => {
    const stored = window.localStorage.getItem("forge_read_shelf") === "1";
    setReadMode(stored);
    function onRead(event: Event) {
      const next = Boolean((event as CustomEvent<boolean>).detail);
      measuredRef.current.clear();
      laneRef.current.clear();
      lockedRef.current.clear();
      setReadMode(next);
      setPackEpoch((epoch) => epoch + 1);
    }
    window.addEventListener("forge-read", onRead);
    return () => window.removeEventListener("forge-read", onRead);
  }, []);

  function fetchPage(next: string) {
    const params = new URLSearchParams({ cursor: next, mix: shelfMix });
    if (filter !== "all") params.set("filter", filter);
    if (category) params.set("category", category);
    return fetch(`/api/feed?${params.toString()}`).then(async (response) => {
      if (!response.ok) throw new Error("feed");
      return (await response.json()) as { posts: FeedCard[]; nextCursor: string | null };
    });
  }

  function armPrefetch(next: string | null) {
    if (!next || prefetchRef.current?.cursor === next) return;
    prefetchRef.current = { cursor: next, promise: fetchPage(next) };
  }

  useEffect(() => {
    const node = moreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) armPrefetch(cursorRef.current);
      },
      { rootMargin: "800px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, shelfMix, filter, category]);

  async function loadMore() {
    const next = cursorRef.current;
    if (!next || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const ready = prefetchRef.current?.cursor === next ? prefetchRef.current.promise : null;
    prefetchRef.current = null;
    try {
      const data = ready ? await ready : await fetchPage(next);
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...data.posts.filter((post) => !seen.has(post.id))];
      });
      cursorRef.current = data.nextCursor;
      setCursor(data.nextCursor);
      armPrefetch(data.nextCursor);
    } catch {
      // Keep the cursor so the same chunk can be requested again.
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  function noteSeen(_id: string) {
    // Opening a story leaves it on the shelf. Older posts stay as new ones arrive.
  }
  noteSeenRef.current = noteSeen;

  useEffect(() => {
    watch?.bindSeen((id) => noteSeenRef.current(id));
  }, [watch]);

  function openAt(index: number) {
    armPlayback();
    if (watch) {
      watch.open({
        posts,
        startIndex: index,
        cursor,
        mix: shelfMix,
        filter,
        category,
        authenticated,
      });
      return;
    }
    setQueue(posts);
    setWatching(index);
  }

  const shelfEmpty = posts.length === 0;
  const columns = useColumnCount();
  if (columns !== columnRef.current) {
    columnRef.current = columns;
    laneRef.current.clear();
    lockedRef.current.clear();
  }
  const lanes = placePosts(posts, columns, laneRef.current, lockedRef.current, measuredRef.current, readMode);
  const skeletonCounts = Array.from({ length: columns }, () => 0);
  if (loading) {
    const heights = lanes.map((lane) => lane.reduce((sum, post) => sum + (measuredRef.current.get(post.id) ?? estimatedHeight(post, readMode)), 0));
    for (let extra = 0; extra < columns; extra += 1) {
      const lane = shortestLane(heights);
      skeletonCounts[lane] += 1;
      heights[lane] += 280;
    }
  }
  const indexOf = new Map(posts.map((post, index) => [post.id, index]));

  useLayoutEffect(() => {
    for (const post of posts) {
      if (lockedRef.current.has(post.id)) continue;
      const node = cardRef.current.get(post.id);
      if (!node) continue;
      const height = node.offsetHeight;
      if (height <= 0) continue;
      measuredRef.current.set(post.id, height);
      lockedRef.current.add(post.id);
    }
  }, [posts, columns, readMode]);

  return (
    <>
      {shelfEmpty ? (
        <p className="rounded-3xl bg-white px-4 py-10 text-center text-sm text-mist shadow-card">
          {caughtUp || initialPosts.length > 0
            ? "You are caught up. Fresh posts arrive through the day."
            : "This shelf is empty for now. New excerpts land through the day."}
        </p>
      ) : (
        <div className="flex items-start gap-2">
          {lanes.map((lane, laneIndex) => (
            <div key={laneIndex} className="flex min-w-0 flex-1 flex-col gap-2">
              {lane.map((post) => (
                <div
                  key={post.id}
                  ref={(node) => {
                    if (node) cardRef.current.set(post.id, node);
                    else cardRef.current.delete(post.id);
                  }}
                >
                  <PostCard
                    post={post}
                    index={indexOf.get(post.id) ?? 0}
                    readMode={readMode}
                    authenticated={authenticated}
                    onOpen={() => openAt(indexOf.get(post.id) ?? 0)}
                  />
                </div>
              ))}
              {Array.from({ length: skeletonCounts[laneIndex] ?? 0 }, (_, index) => (
                <SkeletonCard key={`skeleton-${laneIndex}-${index}`} index={index} />
              ))}
            </div>
          ))}
        </div>
      )}
      {cursor ? (
        <div ref={moreRef} className="mt-4 flex justify-center">
          <button type="button" className="btn min-w-36" onClick={() => void loadMore()} disabled={loading}>
            {loading ? "Loading" : "Load more"}
          </button>
        </div>
      ) : null}
      {watching !== null && queue && !watch ? (
        <WatchFeed
          posts={queue}
          startIndex={watching}
          initialCursor={cursor}
          mix={shelfMix}
          filter={filter}
          category={category}
          authenticated={authenticated}
          onSeen={noteSeen}
          onClose={() => setWatching(null)}
        />
      ) : null}
    </>
  );
}

function estimatedHeight(post: FeedCard, readMode = false) {
  return cardWeight(post, readMode);
}

function shortestLane(heights: number[]) {
  let lane = 0;
  for (let index = 1; index < heights.length; index += 1) {
    if (heights[index] < heights[lane]) lane = index;
  }
  return lane;
}

function placePosts(
  posts: FeedCard[],
  columns: number,
  lanes: Map<string, number>,
  locked: Set<string>,
  measured: Map<string, number>,
  readMode = false,
): FeedCard[][] {
  const present = new Set(posts.map((post) => post.id));
  for (const id of [...lanes.keys()]) {
    if (!present.has(id)) {
      lanes.delete(id);
      locked.delete(id);
    }
  }
  const width = Math.max(columns, 1);
  const placed: FeedCard[][] = Array.from({ length: width }, () => []);
  const heights = Array.from({ length: width }, () => 0);
  const fresh: FeedCard[] = [];
  for (const post of posts) {
    const lane = lanes.get(post.id);
    if (lane === undefined || lane >= width) {
      fresh.push(post);
      continue;
    }
    placed[lane].push(post);
    heights[lane] += measured.get(post.id) ?? estimatedHeight(post, readMode);
  }
  for (const post of fresh) {
    const lane = shortestLane(heights);
    lanes.set(post.id, lane);
    if (measured.has(post.id)) locked.add(post.id);
    placed[lane].push(post);
    heights[lane] += measured.get(post.id) ?? estimatedHeight(post, readMode);
  }
  return placed;
}
