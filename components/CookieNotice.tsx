"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "forge_cookie_notice";

function alreadyChosen(value: string | null) {
  return value === "accepted" || value === "all" || value === "necessary";
}

export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const visible = !alreadyChosen(window.localStorage.getItem(KEY));
    setOpen(visible);
    document.documentElement.dataset.cookie = visible ? "open" : "closed";
  }, []);

  function choose(choice: "all" | "necessary") {
    window.localStorage.setItem(KEY, choice);
    document.documentElement.dataset.cookie = "closed";
    document.documentElement.dataset.cookies = choice;
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 z-50 px-3 bottom-[calc(5.4rem+env(safe-area-inset-bottom))] sm:bottom-4 sm:px-4">
      <div
        role="dialog"
        aria-labelledby="cookie-notice-title"
        aria-describedby="cookie-notice-body"
        className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-[0_16px_50px_rgba(17,17,17,0.14)] sm:flex-row sm:items-center sm:gap-6 sm:p-5"
      >
        <div className="min-w-0">
          <p id="cookie-notice-title" className="text-sm font-extrabold tracking-tight text-cream">
            Cookies
          </p>
          <p id="cookie-notice-body" className="mt-1 text-sm leading-5 text-mist">
            Necessary cookies keep you signed in and remember posts you have opened. This site does not use advertising or analytics cookies. Videos play from other sites, which may set cookies under their own policies.{" "}
            <Link href="/privacy" className="font-semibold text-copper underline underline-offset-2">
              Privacy
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[11.5rem]">
          <button type="button" className="btn w-full" onClick={() => choose("all")}>
            Accept all
          </button>
          <button type="button" className="btn-ghost w-full" onClick={() => choose("necessary")}>
            Accept necessary
          </button>
        </div>
      </div>
    </div>
  );
}
