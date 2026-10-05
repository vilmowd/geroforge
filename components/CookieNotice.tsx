"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "forge_cookie_notice";

export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const visible = window.localStorage.getItem(KEY) !== "accepted";
    setOpen(visible);
    document.documentElement.dataset.cookie = visible ? "open" : "closed";
  }, []);

  if (!open) return null;

  return (
    <div className="border-b border-line bg-[#f7f5ff] px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
      <p className="text-sm font-extrabold text-cream">Cookies</p>
      <p className="mt-1 text-sm leading-5 text-mist">
        GeroForge uses a cookie named forge_session to keep you logged in for 30 days after you sign in, and a cookie named gero_seen to remember posts you open so they can leave the shelf. Neither cookie is used for ads.{" "}
        <Link href="/privacy" className="font-semibold text-copper underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="font-semibold text-copper underline">
          Terms
        </Link>
      </p>
      </div>
      <button
        type="button"
        className="btn shrink-0 sm:w-auto"
        onClick={() => {
          window.localStorage.setItem(KEY, "accepted");
          document.documentElement.dataset.cookie = "closed";
          setOpen(false);
        }}
      >
        OK
      </button>
      </div>
    </div>
  );
}
