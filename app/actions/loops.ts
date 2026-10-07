"use server";

import { getCurrentUser } from "@/lib/auth";
import { cleanLine, type ClipMarkKind, type ClipMarks } from "@/lib/digest";
import { claimPass, clipMarksFor, findUserByName } from "@/lib/loops";
import { findPostRef } from "@/lib/post-ref";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { inferFormat } from "@/lib/remixer";

export type LoopState = { error: string; ok?: boolean };

const CLIP_MARKS = new Set<ClipMarkKind>(["INTERESTING", "UNINTERESTING", "INFORMATIVE"]);

export async function markClip(postId: string, kind: string): Promise<LoopState & { marks?: ClipMarks }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to react to a clip." };
  if (!CLIP_MARKS.has(kind as ClipMarkKind)) return { error: "That reaction is not available." };
  const mark = kind as ClipMarkKind;
  if (!rateLimit(`mark:${user.id}`, 60, 10 * 60 * 1000)) return { error: "Too many reactions. Try again shortly." };
  const post = await findPostRef(postId);
  if (!post) return { error: "That clip is no longer on the shelf." };
  const row = await prisma.post.findFirst({
    where: { id: post.id },
    select: {
      contentType: true,
      sourceName: true,
      sourceUrl: true,
      embedUrl: true,
      category: true,
      remixedContent: true,
    },
  });
  if (!row) return { error: "That clip is no longer on the shelf." };
  const stored =
    row.remixedContent && typeof row.remixedContent === "object" && "format" in row.remixedContent
      ? String((row.remixedContent as { format?: unknown }).format ?? "")
      : null;
  const format = inferFormat({
    contentType: row.contentType,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    embedUrl: row.embedUrl,
    category: row.category,
    stored,
  });
  if (format !== "video" && format !== "reel") return { error: "Reactions are for clips." };
  const existing = await prisma.clipMark.findUnique({
    where: { userId_postId: { userId: user.id, postId: post.id } },
    select: { id: true, kind: true },
  });
  if (existing?.kind === mark) {
    await prisma.clipMark.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.clipMark.update({ where: { id: existing.id }, data: { kind: mark } });
  } else {
    await prisma.clipMark.create({ data: { userId: user.id, postId: post.id, kind: mark } });
  }
  return { error: "", ok: true, marks: await clipMarksFor(post.id, user.id) };
}

export async function settlePass(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await claimPass(user.id);
}

export async function voteExit(postId: string, worth: boolean): Promise<LoopState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in so this answer can shape your shelf." };
  if (!rateLimit(`exit:${user.id}`, 40, 10 * 60 * 1000)) return { error: "Too many answers. Try again shortly." };
  const post = await findPostRef(postId);
  if (!post) return { error: "That post is no longer on the shelf." };
  await prisma.exitVote.upsert({
    where: { userId_postId: { userId: user.id, postId: post.id } },
    update: { worth },
    create: { userId: user.id, postId: post.id, worth },
  });
  return { error: "", ok: true };
}

export async function keepLine(postId: string): Promise<LoopState & { kept?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to keep a line." };
  if (!rateLimit(`keep:${user.id}`, 40, 10 * 60 * 1000)) return { error: "Too many keeps. Try again shortly." };
  const post = await loadNote(postId);
  if (!post) return { error: "That post is no longer on the shelf." };
  const line = post.line;
  if (!line) return { error: "This post has no line to keep." };
  const existing = await prisma.keptLine.findUnique({
    where: { userId_postId: { userId: user.id, postId: post.id } },
    select: { id: true },
  });
  if (existing) {
    await prisma.keptLine.delete({ where: { id: existing.id } });
    return { error: "", ok: true, kept: false };
  }
  await prisma.keptLine.create({
    data: {
      userId: user.id,
      postId: post.id,
      line,
      sourceName: post.sourceName,
      sourceUrl: post.sourceUrl,
    },
  });
  return { error: "", ok: true, kept: true };
}

export async function passClip(postId: string, username: string): Promise<LoopState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to pass a clipping." };
  if (!rateLimit(`pass:${user.id}`, 12, 60 * 60 * 1000)) return { error: "You can pass a few clippings an hour." };
  const post = await findPostRef(postId);
  if (!post) return { error: "That post is no longer on the shelf." };
  const recipient = await findUserByName(username);
  if (!recipient) return { error: "No one on this shelf uses that name." };
  if (recipient.id === user.id) return { error: "Pass it to someone else." };
  await prisma.clipPass.updateMany({
    where: { toUserId: recipient.id, seenAt: null },
    data: { seenAt: new Date() },
  });
  await prisma.clipPass.create({
    data: { fromUserId: user.id, toUserId: recipient.id, postId: post.id },
  });
  return { error: "", ok: true };
}

export async function chooseDoor(postId: string, otherId: string): Promise<LoopState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in so this choice can shape your shelf." };
  if (!rateLimit(`door:${user.id}`, 40, 10 * 60 * 1000)) return { error: "Too many choices. Try again shortly." };
  if (postId === otherId) return { error: "Pick one of the two sources." };
  const chosen = await findPostRef(postId);
  const other = await findPostRef(otherId);
  if (!chosen || !other) return { error: "That pair is no longer on the shelf." };
  await prisma.doorPick.upsert({
    where: { userId_postId_otherId: { userId: user.id, postId: chosen.id, otherId: other.id } },
    update: {},
    create: { userId: user.id, postId: chosen.id, otherId: other.id },
  });
  return { error: "", ok: true };
}

export async function offerLine(postId: string, raw: string): Promise<LoopState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to offer a line." };
  if (!rateLimit(`offer:${user.id}`, 8, 60 * 60 * 1000)) return { error: "Too many lines. Try again in a little while." };
  const line = cleanLine(raw);
  if (!line) return { error: "Write one sentence, 20 to 160 characters, with no link." };
  const post = await loadNote(postId);
  if (!post) return { error: "That post is no longer on the shelf." };
  if (post.line && normalize(post.line) === normalize(line)) return { error: "That is already the desk line." };
  const open = await prisma.lineOffer.count({ where: { postId: post.id, userId: user.id, pulled: false } });
  if (open >= 1) return { error: "Pull your current line before offering another." };
  await prisma.lineOffer.create({ data: { postId: post.id, userId: user.id, line } });
  return { error: "", ok: true };
}

export async function pickLine(offerId: string): Promise<LoopState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to pick a line." };
  if (!rateLimit(`pick:${user.id}`, 40, 10 * 60 * 1000)) return { error: "Too many picks. Try again shortly." };
  if (!/^[a-z0-9]{8,40}$/i.test(offerId)) return { error: "That line is no longer there." };
  const offer = await prisma.lineOffer.findFirst({
    where: { id: offerId, pulled: false },
    select: { id: true, userId: true, picks: true },
  });
  if (!offer) return { error: "That line is no longer there." };
  if (offer.userId === user.id) return { error: "Someone else has to pick your line." };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.linePick.create({ data: { offerId: offer.id, userId: user.id } });
      await tx.lineOffer.update({ where: { id: offer.id }, data: { picks: { increment: 1 } } });
    });
  } catch (error) {
    if (!isUnique(error)) throw error;
  }
  return { error: "", ok: true };
}

export async function pullLine(offerId: string): Promise<LoopState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to pull a line." };
  if (!rateLimit(`pull:${user.id}`, 20, 10 * 60 * 1000)) return { error: "Too many pulls. Try again shortly." };
  if (!/^[a-z0-9]{8,40}$/i.test(offerId)) return { error: "That line is no longer there." };
  const offer = await prisma.lineOffer.findFirst({
    where: { id: offerId, pulled: false },
    select: { id: true, userId: true, flags: true },
  });
  if (!offer) return { error: "That line is no longer there." };
  if (offer.userId === user.id || offer.flags + 1 >= 2) {
    await prisma.lineOffer.update({ where: { id: offer.id }, data: { pulled: true, flags: { increment: offer.userId === user.id ? 0 : 1 } } });
    return { error: "", ok: true };
  }
  await prisma.lineOffer.update({ where: { id: offer.id }, data: { flags: { increment: 1 } } });
  return { error: "", ok: true };
}

async function loadNote(token: string) {
  const ref = await findPostRef(token);
  if (!ref) return null;
  const post = await prisma.post.findUnique({
    where: { id: ref.id },
    select: { id: true, sourceName: true, sourceUrl: true, title: true, remixedContent: true },
  });
  if (!post) return null;
  const remix = post.remixedContent as { tldr?: string; markdown?: string } | null;
  const body = `${remix?.markdown || remix?.tldr || ""}`.replace(/\s+/g, " ").trim();
  const line = (body || remix?.tldr || "").slice(0, 520);
  return { ...post, line: line.length >= 20 && line !== post.title ? line : null };
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isUnique(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002");
}

