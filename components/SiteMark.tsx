"use client";

import { useEffect, useRef, useState } from "react";

const MARK_VERSION = "5";

export function SiteMark({
  host,
  children,
}: {
  host: string | null;
  large?: boolean;
  children: React.ReactNode;
}) {
  const photoRef = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "bad">(host ? "loading" : "bad");
  const [px, setPx] = useState(0);

  useEffect(() => {
    const image = photoRef.current;
    const frame = image?.parentElement;
    if (!image || !frame || !host) return;

    const place = () => {
      if (!image.complete || image.naturalWidth <= 0) return;
      const box = frame.getBoundingClientRect();
      const edge = Math.min(box.width, box.height);
      if (edge < 80) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const half = edge * 0.5;
      const sharp = image.naturalWidth / dpr;
      const next = Math.round(image.naturalWidth >= 256 ? half : Math.min(half, sharp));
      if (next < 40) {
        setPhase("bad");
        return;
      }
      setPx(next);
      setPhase("ready");
    };

    place();
    image.addEventListener("load", place);
    const observer = new ResizeObserver(place);
    observer.observe(frame);
    return () => {
      image.removeEventListener("load", place);
      observer.disconnect();
    };
  }, [host]);

  if (!host || phase === "bad") return children;

  return (
    <div className="absolute inset-0 bg-white">
      {phase === "loading" ? <span className="skeleton pointer-events-none absolute inset-0" /> : null}
      <img
        ref={photoRef}
        src={`/api/mark?host=${encodeURIComponent(host)}&v=${MARK_VERSION}`}
        alt=""
        decoding="async"
        draggable={false}
        className={`absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 object-contain ${phase === "ready" ? "opacity-100" : "opacity-0"}`}
        style={px ? { width: px, height: px } : undefined}
        onError={() => setPhase("bad")}
      />
    </div>
  );
}
