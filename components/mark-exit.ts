"use client";

const KEY = "forge_exit_pending";

type PendingExit = { postId: string; sourceName: string };

// Development mounts the prompt twice. A module value survives that second
// mount, so the first read does not throw the return away.
let held: PendingExit | null = null;

export function markExit(postId: string, sourceName: string) {
  held = null;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ postId, sourceName, at: Date.now() }));
  } catch {
    // Private mode can block storage. The rest of the shelf still works.
  }
}

export function clearExit() {
  held = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Already gone, or storage is blocked.
  }
}

export function takeExit(minAgeMs = 1200): PendingExit | null {
  if (held) return held;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { postId?: string; sourceName?: string; at?: number };
    if (!parsed.postId || !parsed.sourceName || typeof parsed.at !== "number") {
      sessionStorage.removeItem(KEY);
      return null;
    }
    if (Date.now() - parsed.at < minAgeMs || Date.now() - parsed.at > 6 * 60 * 60 * 1000) return null;
    held = { postId: parsed.postId, sourceName: parsed.sourceName };
    sessionStorage.removeItem(KEY);
    return held;
  } catch {
    return null;
  }
}
