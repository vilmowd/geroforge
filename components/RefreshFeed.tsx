"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { clearShelfCache } from "@/components/shelf-cache";

export function RefreshFeed() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="Refresh feed"
      onClick={() =>
        startTransition(() => {
          clearShelfCache();
          router.refresh();
        })
      }
      disabled={pending}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[13px] font-semibold text-cream shadow-sm active:scale-95 disabled:opacity-60 sm:bg-[#f3f4f6] sm:py-1.5 sm:text-xs sm:shadow-none"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
      Refresh
    </button>
  );
}
