"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { voteExit } from "@/app/actions/loops";
import { clearExit, takeExit } from "@/components/mark-exit";

type Pending = { postId: string; sourceName: string };

export function ExitPrompt() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function look() {
      if (document.visibilityState === "hidden") return;
      const next = takeExit();
      if (next) {
        setNote("");
        setPending(next);
      }
    }
    look();
    window.addEventListener("focus", look);
    document.addEventListener("visibilitychange", look);
    return () => {
      window.removeEventListener("focus", look);
      document.removeEventListener("visibilitychange", look);
    };
  }, []);

  if (!pending) return null;

  async function answer(worth: boolean) {
    if (!pending || busy) return;
    setBusy(true);
    const result = await voteExit(pending.postId, worth);
    setBusy(false);
    if (result.error) {
      setNote(result.error);
      return;
    }
    clearExit();
    setPending(null);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(3.7rem+env(safe-area-inset-top))] z-[60] px-3">
      <div role="dialog" aria-labelledby="exit-prompt-title" className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_16px_50px_rgba(17,17,17,0.14)]">
        <div>
          <p id="exit-prompt-title" className="text-sm font-extrabold tracking-tight text-cream">
            Worth the exit?
          </p>
          <p className="mt-1 text-sm leading-5 text-mist">
            You left for {pending.sourceName}. Should that source show up more often on your shelf?
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" disabled={busy} onClick={() => void answer(true)}>
            Worth it
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => void answer(false)}>
            Not worth it
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => {
              clearExit();
              setPending(null);
            }}
          >
            Skip
          </button>
        </div>
        {note ? (
          <p className="text-sm text-mist">
            {note}{" "}
            {note.startsWith("Sign in") ? (
              <Link href="/login?next=/" className="font-semibold text-copper underline">
                Log in
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
