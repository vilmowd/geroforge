import { prisma } from "@/lib/prisma";

export function postWhere(token: string): { publicId: string } | { slug: string } | { id: string } | null {
  if (!token || token.length > 80) return null;
  if (token.includes("-")) return { slug: token };
  if (token.length === 32 && /^[a-f0-9]+$/i.test(token)) return { publicId: token };
  if (/^[a-z0-9]{8,40}$/i.test(token)) return { id: token };
  return null;
}

export async function findPostRef(token: string) {
  const where = postWhere(token);
  if (!where) return null;
  return prisma.post.findFirst({
    where,
    select: { id: true, slug: true, publicId: true, authorId: true },
  });
}
