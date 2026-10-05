"use client";

import { useEffect, useRef, useState } from "react";

function fittedMark(image: HTMLImageElement, large: boolean): number {
  const measured = image.naturalWidth > 0 ? Math.min(image.naturalWidth, image.naturalHeight || image.naturalWidth) : 512;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const frame = image.parentElement?.getBoundingClientRect();
  const edge = Math.min(frame?.width || 280, frame?.height || 280);
  const design = large
    ? Math.round(Math.min(320, Math.max(160, edge * 0.42)))
    : Math.round(Math.min(112, Math.max(64, edge * 0.4)));
  const sharp = Math.floor(measured / dpr);
  if (sharp < 40) return 0;
  return Math.min(design, sharp);
}

export function SiteMark({
  host,
  large = false,
  children,
}: {
  host: string | null;
  large?: boolean;
  children: React.ReactNode;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "bad">(host ? "loading" : "bad");
  const [px, setPx] = useState(large ? 180 : 88);

  function reveal(image: HTMLImageElement) {
    const next = fittedMark(image, large);
    if (!next) {
      setPhase("bad");
      return;
    }
    setPx(next);
    setPhase("ready");
  }

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete || image.naturalWidth <= 0) return;
    reveal(image);
  }, [host, large]);

  if (!host || phase === "bad") return children;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white">
      {phase === "loading" ? <span className="skeleton pointer-events-none absolute inset-0" /> : null}
      <img
        ref={imageRef}
        src={`/api/mark?host=${encodeURIComponent(host)}`}
        alt=""
        width={px}
        height={px}
        decoding="async"
        draggable={false}
        referrerPolicy="no-referrer"
        className={`relative z-[1] object-contain ${large ? "max-h-[min(320px,52%)] max-w-[min(320px,70%)]" : "max-h-[46%] max-w-[46%]"} ${phase === "ready" ? "opacity-100" : "opacity-0"}`}
        style={{ width: px, height: px }}
        onLoad={(event) => reveal(event.currentTarget)}
        onError={() => setPhase("bad")}
      />
    </div>
  );
}
