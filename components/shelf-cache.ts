"use client";

import type { FeedCard } from "@/lib/feed";

const PREFIX = "gero-shelf:v5:";
const MAX_POSTS = 30;

export type ShelfCache = {
  mix: string;
  posts: FeedCard[];
  cursor: string | null;
};

export function readShelfCache(filter: string, category?: string): ShelfCache | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(filter, category));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShelfCache;
    if (!parsed || typeof parsed.mix !== "string" || !Array.isArray(parsed.posts)) return null;
    return {
      mix: parsed.mix,
      posts: parsed.posts.slice(0, MAX_POSTS),
      cursor: parsed.cursor ?? null,
    };
  } catch {
    return null;
  }
}

export function writeShelfCache(filter: string, category: string | undefined, value: ShelfCache) {
  try {
    sessionStorage.setItem(
      cacheKey(filter, category),
      JSON.stringify({ ...value, posts: value.posts.slice(0, MAX_POSTS) }),
    );
  } catch {
    // Storage can be full or blocked. The shelf still renders from the page.
  }
}

export function clearShelfCache() {
  try {
    const keys: string[] = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function cacheKey(filter: string, category?: string) {
  return `${PREFIX}${filter}:${category || ""}`;
}
