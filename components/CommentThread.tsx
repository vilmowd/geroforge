"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addComment, likeComment, type ActionState } from "@/app/actions/engagement";
import { FamePoints } from "@/components/FamePoints";
import type { CommentNode } from "@/lib/comments";
import { timeAgo } from "@/lib/format";

const initial: ActionState = { error: "" };

export function CommentThread({
  postId,
  returnPath,
  authenticated,
  comments,
  embedded = false,
  onRefresh,
}: {
  postId: string;
  returnPath: string;
  authenticated: boolean;
  comments: CommentNode[];
  embedded?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <section className={embedded ? "" : "mt-12 border-t border-line pt-8"}>
      {embedded ? null : <h2 className="text-xl font-extrabold text-cream">Comments</h2>}
      {authenticated ? (
        <CommentComposer postId={postId} returnPath={returnPath} parentId="" onRefresh={onRefresh} />
      ) : (
        <p className="mt-4 text-sm text-mist">
          <Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="text-copper hover:underline">
            Sign in
          </Link>{" "}
          to join the thread.
        </p>
      )}
      {comments.length === 0 ? (
        <p className="mt-6 text-sm text-mist">No comments yet.</p>
      ) : (
        <ol className="mt-6 space-y-5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              returnPath={returnPath}
              authenticated={authenticated}
              depth={0}
              onRefresh={onRefresh}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  postId,
  returnPath,
  authenticated,
  depth,
  onRefresh,
}: {
  comment: CommentNode;
  postId: string;
  returnPath: string;
  authenticated: boolean;
  depth: number;
  onRefresh?: () => void;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <li className={depth > 0 ? "border-l border-line pl-4" : ""}>
      <article>
        <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-mist">
          {comment.authorRef ? (
            <Link href={`/u/${comment.authorRef}`} className="font-semibold text-cream hover:underline">
              {comment.authorName}
            </Link>
          ) : (
            <span className="font-semibold text-cream">{comment.authorName}</span>
          )}
          <FamePoints points={comment.karma} />
          <span>{timeAgo(comment.createdAt)}</span>
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-cream">{comment.content}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <CommentLike
            commentId={comment.id}
            count={comment.likeCount}
            liked={comment.liked}
            authenticated={authenticated}
            returnPath={returnPath}
            onRefresh={onRefresh}
          />
          {authenticated && depth < 3 ? (
          <button
            type="button"
            className="min-h-9 px-2 text-xs font-semibold text-copper"
            onClick={() => setReplying((open) => !open)}
          >
            {replying ? "Cancel" : "Reply"}
          </button>
          ) : null}
        </div>
        {replying ? (
          <CommentComposer postId={postId} returnPath={returnPath} parentId={comment.id} compact onRefresh={onRefresh} />
        ) : null}
      </article>
      {comment.replies.length > 0 ? (
        <ol className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              returnPath={returnPath}
              authenticated={authenticated}
              depth={depth + 1}
              onRefresh={onRefresh}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function CommentLike({
  commentId,
  count,
  liked,
  authenticated,
  returnPath,
  onRefresh,
}: {
  commentId: string;
  count: number;
  liked: boolean;
  authenticated: boolean;
  returnPath: string;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({ count, liked });

  useEffect(() => {
    setState({ count, liked });
  }, [count, liked]);

  return (
    <button
      type="button"
      aria-pressed={state.liked}
      disabled={pending}
      className={`min-h-9 rounded-full px-2 text-xs font-semibold ${state.liked ? "text-copper" : "text-mist"}`}
      onClick={() => {
        if (!authenticated) {
          router.push(`/login?next=${encodeURIComponent(returnPath)}`);
          return;
        }
        const nextLiked = !state.liked;
        setState({ liked: nextLiked, count: Math.max(0, state.count + (nextLiked ? 1 : -1)) });
        startTransition(async () => {
          await likeComment(commentId, returnPath);
          onRefresh?.();
        });
      }}
    >
      {state.liked ? "Liked" : "Like"} · {state.count}
    </button>
  );
}

function CommentComposer({
  postId,
  returnPath,
  parentId,
  compact = false,
  onRefresh,
}: {
  postId: string;
  returnPath: string;
  parentId: string;
  compact?: boolean;
  onRefresh?: () => void;
}) {
  const [state, action, pending] = useActionState(addComment, initial);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) onRefresh?.();
    wasPending.current = pending;
  }, [pending, state.error, onRefresh]);

  return (
    <form action={action} className={compact ? "mt-3" : "mt-5"}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="parentId" value={parentId} />
      <label className="block">
        <span className="sr-only">{compact ? "Reply" : "Comment"}</span>
        <textarea
          name="content"
          required
          minLength={2}
          maxLength={2000}
          rows={compact ? 3 : 4}
          placeholder={compact ? "Write a reply" : "Add to the discussion"}
          className="field resize-y"
        />
      </label>
      {state.error ? <p className="mt-2 text-sm text-copper">{state.error}</p> : null}
      <button className="btn mt-3" type="submit" disabled={pending}>
        {pending ? "Posting…" : compact ? "Reply" : "Comment"}
      </button>
    </form>
  );
}
