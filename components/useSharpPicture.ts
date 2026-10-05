"use client";

import { useEffect, useState } from "react";
import { pictureSources } from "@/lib/thumbnails";

const TINY = 400;

export function useSharpPicture(input: string | null | undefined) {
  const sources = pictureSources(input);
  const key = sources.join("|");
  const [shown, setShown] = useState(sources[0] || "");

  useEffect(() => {
    const list = pictureSources(input);
    let cancelled = false;
    setShown(list[0] || "");
    if (!list.length) return;

    function probe(index: number) {
      const url = list[index];
      if (!url) return;
      const image = new Image();
      image.referrerPolicy = "no-referrer";
      image.onload = () => {
        if (cancelled) return;
        const tiny = image.naturalWidth > 0 && image.naturalWidth < TINY;
        if (tiny && index + 1 < list.length) {
          probe(index + 1);
          return;
        }
        setShown(url);
      };
      image.onerror = () => {
        if (cancelled) return;
        if (index + 1 < list.length) probe(index + 1);
        else if (index === 0) setShown("");
      };
      image.src = url;
    }

    probe(0);
    return () => {
      cancelled = true;
    };
  }, [input, key]);

  return { src: shown };
}
