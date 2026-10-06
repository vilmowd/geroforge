"use client";

import { useEffect, useState } from "react";
import { BookOpenText } from "lucide-react";

const KEY = "forge_read_shelf";

export function ReadShelf() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(window.localStorage.getItem(KEY) === "1");
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    window.localStorage.setItem(KEY, next ? "1" : "0");
    window.dispatchEvent(new CustomEvent("forge-read", { detail: next }));
  }

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={toggle}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold shadow-sm active:scale-95 sm:py-1.5 sm:text-xs sm:shadow-none ${
        on ? "bg-copper text-white" : "bg-white text-cream sm:bg-[#f3f4f6]"
      }`}
    >
      <BookOpenText className="h-3.5 w-3.5" aria-hidden="true" />
      {on ? "Watch the shelf" : "Read the shelf"}
    </button>
  );
}
