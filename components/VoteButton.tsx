"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, Heart } from "lucide-react";
import { voteOnPost } from "@/app/actions/engagement";

export function VoteButton({
  postId,
  count,
  voted,
  authenticated,
  returnPath,
  layout = "stack",
  onCount,
}: {
  postId: string;
  count: number;
  voted: boolean;
  authenticated: boolean;
  returnPath: string;
  layout?: "stack" | "inline" | "tile";
  onCount?: (count: number) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({ count, voted });
  const [pop, setPop] = useState(false);

  useEffect(() => {
    setState({ count, voted });
  }, [count, voted]);

  useEffect(() => {
    onCount?.(state.count);
  }, [onCount, state.count]);

  function onVote() {
    if (!authenticated) {
      router.push(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }
    const nextVoted = !state.voted;
    setPop(true);
    window.setTimeout(() => setPop(false), 560);
    setState({
      voted: nextVoted,
      count: Math.max(0, state.count + (nextVoted ? 1 : -1)),
    });
    startTransition(() => voteOnPost(postId, returnPath));
  }

  if (layout === "stack") {
    return (
      <button
        type="button"
        aria-pressed={state.voted}
        aria-label={state.voted ? "Remove like" : "Like"}
        disabled={pending}
        onClick={onVote}
        className={`story-action like-btn ${state.voted ? "is-on" : ""} ${pop ? "is-pop" : ""}`}
      >
        <Heart className={`h-5 w-5 ${state.voted ? "fill-white" : ""}`} strokeWidth={2.4} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={state.voted}
      aria-label={state.voted ? "Remove upvote" : "Upvote"}
      disabled={pending}
      onClick={onVote}
      className={`${pop ? "vote-pop" : ""} ${
        layout === "tile"
          ? `inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold shadow disabled:opacity-70 ${
              state.voted ? "bg-rose-500 text-white" : "bg-white/95 text-rose-500"
            }`
          : `rounded-xl border transition disabled:opacity-70 ${
              layout === "inline"
                ? "inline-flex items-center gap-2 px-3 py-2"
                : "flex min-h-11 min-w-12 flex-col items-center justify-center px-2 py-1.5"
            } ${
              state.voted
                ? "border-copper/70 bg-copper/10 text-copper"
                : "border-line bg-white text-mist"
            }`
      }`}
      onAnimationEnd={() => setPop(false)}
    >
      {layout === "tile" ? (
        <Heart className={`h-3.5 w-3.5 ${state.voted ? "fill-white" : "fill-rose-500"}`} aria-hidden="true" />
      ) : (
        <ChevronUp className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="text-xs tabular-nums">{state.count}</span>
    </button>
  );
}
