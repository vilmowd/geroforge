import { LINE_LEAD, type LineOfferView } from "@/lib/digest";
import { prisma } from "@/lib/prisma";
import { emailKey, reveal } from "@/lib/seal";

type DigestInput = {
  id: string;
  tldr: string | null;
  deskLine: string | null;
  roomLine: string | null;
  kept: boolean;
  offers: LineOfferView[];
};

export async function sourceWeights(userId: string | undefined): Promise<Map<string, number>> {
  const weights = new Map<string, number>();
  if (!userId) return weights;
  const [exits, doors] = await Promise.all([
    prisma.exitVote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { worth: true, post: { select: { sourceName: true } } },
    }),
    prisma.doorPick.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { post: { select: { sourceName: true } } },
    }),
  ]);
  for (const vote of exits) addWeight(weights, vote.post.sourceName, vote.worth ? 1 : -1);
  for (const pick of doors) addWeight(weights, pick.post.sourceName, 1);
  return weights;
}

export async function attachDigest<T extends DigestInput>(cards: T[], userId?: string): Promise<T[]> {
  if (cards.length === 0) return cards;
  const publicIds = cards.map((card) => card.id);
  const posts = await prisma.post.findMany({
    where: { publicId: { in: publicIds } },
    select: { id: true, publicId: true },
  });
  const internal = new Map(posts.map((post) => [post.publicId, post.id]));
  const postIds = posts.map((post) => post.id);
  if (postIds.length === 0) return cards;
  const [offers, kept] = await Promise.all([
    prisma.lineOffer.findMany({
      where: { postId: { in: postIds }, pulled: false },
      orderBy: [{ picks: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        postId: true,
        userId: true,
        line: true,
        picks: true,
        picksBy: userId ? { where: { userId }, select: { id: true } } : false,
      },
    }),
    userId
      ? prisma.keptLine.findMany({
          where: { userId, postId: { in: postIds } },
          select: { postId: true },
        })
      : Promise.resolve([]),
  ]);
  const keptIds = new Set(kept.map((row) => row.postId));
  const byPost = new Map<string, LineOfferView[]>();
  const winning = new Map<string, string>();
  for (const offer of offers) {
    const view: LineOfferView = {
      id: offer.id,
      line: offer.line,
      picks: offer.picks,
      mine: Boolean(userId && offer.userId === userId),
      picked: Array.isArray(offer.picksBy) && offer.picksBy.length > 0,
    };
    const list = byPost.get(offer.postId) ?? [];
    if (list.length < 3) list.push(view);
    byPost.set(offer.postId, list);
    if (offer.picks >= LINE_LEAD && !winning.has(offer.postId)) winning.set(offer.postId, offer.line);
  }
  return cards.map((card) => {
    const postId = internal.get(card.id);
    if (!postId) return card;
    const roomLine = winning.get(postId) ?? null;
    return {
      ...card,
      deskLine: card.deskLine ?? card.tldr,
      roomLine,
      tldr: roomLine || card.tldr,
      kept: keptIds.has(postId),
      offers: byPost.get(postId) ?? [],
    };
  });
}

export async function peekPass(userId: string): Promise<{ publicId: string; fromName: string } | null> {
  const pass = await prisma.clipPass.findFirst({
    where: { toUserId: userId, seenAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      post: { select: { publicId: true } },
      fromUser: { select: { name: true } },
    },
  });
  if (!pass) return null;
  const name = pass.fromUser.name ? reveal(pass.fromUser.name) : "";
  return { publicId: pass.post.publicId, fromName: name && !name.includes("@") ? name : "Someone" };
}

export async function claimPass(userId: string) {
  await prisma.clipPass.updateMany({
    where: { toUserId: userId, seenAt: null },
    data: { seenAt: new Date() },
  });
}

export async function linesForUser(userId: string) {
  const rows = await prisma.keptLine.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 24,
    select: {
      id: true,
      line: true,
      sourceName: true,
      sourceUrl: true,
      post: { select: { publicId: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    line: row.line,
    sourceName: row.sourceName,
    sourceUrl: safeHttp(row.sourceUrl),
    slug: row.post.publicId,
  }));
}

export async function findUserByName(raw: string) {
  const name = raw.trim();
  if (!/^[A-Za-z][A-Za-z0-9]{2,32}$/.test(name)) return null;
  const nameHash = emailKey(name.toLowerCase());
  const found = await prisma.user.findUnique({ where: { nameHash }, select: { id: true, name: true } });
  if (found) return found;
  await backfillNameHashes();
  return prisma.user.findUnique({ where: { nameHash }, select: { id: true, name: true } });
}

async function backfillNameHashes() {
  const rows = await prisma.user.findMany({
    where: { nameHash: null, name: { not: null } },
    take: 40,
    select: { id: true, name: true },
  });
  for (const row of rows) {
    const opened = row.name ? reveal(row.name).trim() : "";
    if (!opened || opened.includes("@")) continue;
    await prisma.user.update({
      where: { id: row.id },
      data: { nameHash: emailKey(opened.toLowerCase()) },
    });
  }
}

function addWeight(weights: Map<string, number>, sourceName: string, delta: number) {
  weights.set(sourceName, (weights.get(sourceName) ?? 0) + delta);
}

function safeHttp(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}
