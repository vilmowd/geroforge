"use client";

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { pictureSources } from "@/lib/thumbnails";

const TINY = 400;

export function useSharpPicture(input: string | null | undefined) {
  const sources = pictureSources(input);
  const key = sources.join("|");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "missing">(sources.length ? "loading" : "missing");
  const decided = useRef(-1);
  const seenKey = useRef(key);

  useEffect(() => {
    if (seenKey.current === key) return;
    seenKey.current = key;
    decided.current = -1;
    setIndex(0);
    setPhase(sources.length ? "loading" : "missing");
  }, [key, sources.length]);

  const current = sources[index] || "";

  const settle = useCallback(
    (node: HTMLImageElement) => {
      if (decided.current === index) return;
      const tooSmall = node.naturalWidth > 0 && node.naturalWidth < TINY;
      const broken = node.naturalWidth === 0;
      if ((tooSmall || broken) && index + 1 < sources.length) {
        decided.current = index;
        setIndex(index + 1);
        setPhase("loading");
        return;
      }
      decided.current = index;
      setPhase(node.naturalWidth > 0 ? "ready" : "missing");
    },
    [index, sources.length],
  );

  const onError = useCallback(() => {
    if (decided.current === index) return;
    if (index + 1 < sources.length) {
      decided.current = index;
      setIndex(index + 1);
      setPhase("loading");
      return;
    }
    decided.current = index;
    setPhase("missing");
  }, [index, sources.length]);

  const ref = useCallback(
    (node: HTMLImageElement | null) => {
      if (!node?.complete) return;
      if (node.naturalWidth > 0) settle(node);
      else onError();
    },
    [onError, settle],
  );

  const onLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      settle(event.currentTarget);
    },
    [settle],
  );

  return { src: current, phase, ref, onLoad, onError };
}
