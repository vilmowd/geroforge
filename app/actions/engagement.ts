"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/format";
import { findPostRef } from "@/lib/post-ref";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export type ActionState = { error: string };

export async function likeComment(commentId: string, returnPath: string) {
  const user = await getCurrentUser();
  const nextPath = safeNextPath(returnPath);
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!rateLimit(`like:${user.id}`, 60, 10 * 60 * 1000)) return;
  if (!commentId || commentId.length > 64) return;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, post: { select: { publicId: true } } },
  });
  if (!comment) return;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.commentLike.findUnique({
        where: { userId_commentId: { userId: user.id, commentId: comment.id } },
      });
      const awardsPoints = comment.userId !== user.id;
      if (existing) {
        await tx.commentLike.delete({ where: { id: existing.id } });
        await tx.comment.updateMany({
          where: { id: comment.id, likeCount: { gt: 0 } },
          data: { likeCount: { decrement: 1 } },
        });
        if (awardsPoints) {
          await tx.user.updateMany({
            where: { id: comment.userId, karma: { gt: 0 } },
            data: { karma: { decrement: 1 } },
          });
        }
        return;
      }
      await tx.commentLike.create({ data: { userId: user.id, commentId: comment.id } });
      await tx.comment.update({ where: { id: comment.id }, data: { likeCount: { increment: 1 } } });
      if (awardsPoints) {
        await tx.user.update({ where: { id: comment.userId }, data: { karma: { increment: 1 } } });
      }
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
  }

}

export async function voteOnPost(postId: string, returnPath: string) {
  const user = await getCurrentUser();
  const nextPath = safeNextPath(returnPath);
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!rateLimit(`vote:${user.id}`, 60, 10 * 60 * 1000)) return;
  if (!postId || postId.length > 64) return;

  const post = await findPostRef(postId);
  if (!post) return;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.vote.findUnique({
        where: { userId_postId: { userId: user.id, postId: post.id } },
      });
      if (existing) {
        await tx.vote.delete({ where: { id: existing.id } });
        await tx.post.updateMany({
          where: { id: post.id, upvotesCount: { gt: 0 } },
          data: { upvotesCount: { decrement: 1 } },
        });
        return;
      }

      await tx.vote.create({ data: { userId: user.id, postId: post.id, value: 1 } });
      await tx.post.update({
        where: { id: post.id },
        data: { upvotesCount: { increment: 1 } },
      });
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
  }

}

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const returnPath = safeNextPath(String(formData.get("returnPath") || "/"));
  if (!user) redirect(`/login?next=${encodeURIComponent(returnPath)}`);

  const postId = String(formData.get("postId") || "");
  const parentIdRaw = String(formData.get("parentId") || "");
  const parentId = parentIdRaw.length > 0 ? parentIdRaw : null;
  const content = cleanComment(String(formData.get("content") || ""));
  if (!content) return { error: "Write a comment between 2 and 2000 characters." };
  if (!rateLimit(`comment:${user.id}`, 12, 10 * 60 * 1000)) {
    return { error: "Too many comments in a short time. Try again in a few minutes." };
  }

  const post = await findPostRef(postId);
  if (!post) return { error: "That post is no longer on the wire." };

  if (parentId) {
    const depth = await commentDepth(parentId, post.id);
    if (depth === null) return { error: "That comment is no longer there." };
    if (depth >= 4) return { error: "Replies only go four levels deep." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.create({
      data: { content, postId: post.id, userId: user.id, parentId },
    });
    await tx.post.update({ where: { id: post.id }, data: { commentCount: { increment: 1 } } });
    if (parentId) {
      const parent = await tx.comment.findFirst({
        where: { id: parentId, postId: post.id },
        select: { userId: true },
      });
      if (parent && parent.userId !== user.id) {
        await tx.user.update({ where: { id: parent.userId }, data: { karma: { increment: 1 } } });
      }
    }
  });

  return { error: "" };
}

async function commentDepth(parentId: string, postId: string): Promise<number | null> {
  let depth = 0;
  let current: string | null = parentId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current) || depth > 6) return null;
    seen.add(current);
    const row: { parentId: string | null } | null = await prisma.comment.findFirst({
      where: { id: current, postId },
      select: { parentId: true },
    });
    if (!row) return null;
    depth += 1;
    current = row.parentId;
  }
  return depth;
}

function cleanComment(value: string): string | null {
  const text = value.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 2 || text.length > 2000) return null;
  return text;
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002");
}
