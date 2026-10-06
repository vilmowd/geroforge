"use client";

import { useState } from "react";

const MARK_VERSION = "5";

export function SourceFavicon({ host, large = false }: { host: string | null; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!host || failed) return null;
  const size = large ? 28 : 18;
  return (
    <img
      src={`/api/mark?host=${encodeURIComponent(host)}&v=${MARK_VERSION}`}
      alt=""
      width={size}
      height={size}
      className={`${large ? "h-7 w-7 rounded-[7px]" : "h-[18px] w-[18px] rounded-[5px]"} shrink-0 bg-white object-contain ring-1 ring-black/10`}
      onError={() => setFailed(true)}
    />
  );
}
