"use client";

import { createContext, Suspense, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { WatchFeed } from "@/components/WatchFeed";
import type { FeedCard, FeedFilter } from "@/lib/feed";

type WatchRequest = {
  posts: FeedCard[];
  startIndex: number;
  cursor: string | null;
  mix: string;
  filter: FeedFilter;
  category?: string;
  authenticated: boolean;
};

type WatchApi = {
  open: (request: WatchRequest) => void;
  bindSeen: (fn: (id: string) => void) => void;
};

const WatchContext = createContext<WatchApi | null>(null);

export function useWatch(): WatchApi | null {
  return useContext(WatchContext);
}

export function WatchSession({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [request, setRequest] = useState<WatchRequest | null>(null);
  const seenRef = useRef<(id: string) => void>(() => undefined);
  const open = useCallback((next: WatchRequest) => setRequest(next), []);
  const bindSeen = useCallback((fn: (id: string) => void) => {
    seenRef.current = fn;
  }, []);

  return (
    <WatchContext.Provider value={{ open, bindSeen }}>
      {fallback ? <Suspense fallback={fallback}>{children}</Suspense> : children}
      {request ? (
        <WatchFeed
          posts={request.posts}
          startIndex={request.startIndex}
          initialCursor={request.cursor}
          mix={request.mix}
          filter={request.filter}
          category={request.category}
          authenticated={request.authenticated}
          onSeen={(id) => seenRef.current(id)}
          onClose={() => setRequest(null)}
        />
      ) : null}
    </WatchContext.Provider>
  );
}
