"use client";

import { useState } from "react";

const MARK_VERSION = "5";

export function SourceFavicon({ host }: { host: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!host || failed) return null;
  return (
    <img
      src={`/api/mark?host=${encodeURIComponent(host)}&v=${MARK_VERSION}`}
      alt=""
      width={18}
      height={18}
      className="h-[18px] w-[18px] shrink-0 rounded-[5px] bg-white object-contain ring-1 ring-black/10"
      onError={() => setFailed(true)}
    />
  );
}
