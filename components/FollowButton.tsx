"use client";

import { useState, useTransition } from "react";
import { setFollow } from "@/app/actions/house";

export function FollowButton({
  kind,
  value,
  initial,
  label,
}: {
  kind: "desk" | "source";
  value: string;
  initial: boolean;
  label?: string;
}) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const name = label || (kind === "desk" ? value : value);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        aria-pressed={on}
        disabled={pending}
        onClick={() => {
          setError("");
          start(async () => {
            const result = await setFollow(kind, value);
            if (result.error) setError(result.error);
            else setOn(Boolean(result.on));
          });
        }}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95 disabled:opacity-60 ${
          on ? "bg-copper text-white" : "bg-white text-cream shadow-sm"
        }`}
      >
        {on ? `Following ${name}` : `Follow ${name}`}
      </button>
      {error ? <span className="text-xs text-mist">{error}</span> : null}
    </span>
  );
}
