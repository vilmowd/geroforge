import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

const SEEN_COOKIE = "gero_seen";
const MAX_COOKIE = 80;
const MAX_ACCOUNT = 200;
let seenWrites = 0;

export const readSeenIds = cache(async function readSeenIds(userId?: string): Promise<string[]> {
  const jar = await cookies();
  const fromCookie = parseSeen(jar.get(SEEN_COOKIE)?.value);
  if (!userId) return fromCookie;
  const rows = await prisma.seenPost.findMany({
    where: { userId },
    orderBy: { seenAt: "desc" },
    take: MAX_ACCOUNT,
    select: { postId: true, post: { select: { publicId: true } } },
  });
  const stored = rows.flatMap((row) => [row.post?.publicId, row.postId]).filter((id): id is string => Boolean(id));
  return unique([...stored, ...fromCookie]).slice(0, MAX_ACCOUNT);
});

export async function rememberSeen(token: string, userId?: string) {
  if (!/^[a-z0-9]{8,40}$/i.test(token)) return;
  const post = await prisma.post.findFirst({
    where: token.length === 32 ? { publicId: token } : { id: token },
    select: { id: true, publicId: true },
  });
  if (!post) return;
  const jar = await cookies();
  const next = unique([post.publicId, ...parseSeen(jar.get(SEEN_COOKIE)?.value)]).slice(0, MAX_COOKIE);
  jar.set(SEEN_COOKIE, next.join(","), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    secure: process.env.NODE_ENV === "production",
  });
  if (!userId) return;
  try {
    await prisma.seenPost.upsert({
      where: { userId_postId: { userId, postId: post.id } },
      create: { userId, postId: post.id },
      update: { seenAt: new Date() },
    });
  } catch {
    return;
  }
  seenWrites += 1;
  if (seenWrites % 25 !== 0) return;
  const stale = await prisma.seenPost.findMany({
    where: { userId },
    orderBy: { seenAt: "desc" },
    skip: MAX_ACCOUNT,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.seenPost.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
  }
}

function parseSeen(value: string | undefined): string[] {
  if (!value) return [];
  return unique(value.split(",").filter((id) => /^[a-z0-9]{8,40}$/i.test(id))).slice(0, MAX_ACCOUNT);
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}
