import { linesForUser } from "@/lib/loops";
import { prisma } from "@/lib/prisma";
import { reveal } from "@/lib/seal";

export type KeptLineView = {
  id: string;
  line: string;
  sourceName: string;
  sourceUrl: string | null;
  slug: string;
};

export type PublicProfile = {
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  posts: number;
  likes: number;
  comments: number;
  lines: KeptLineView[];
};

export async function publicProfile(token: string): Promise<PublicProfile | null> {
  if (!/^[a-f0-9]{32}$/i.test(token)) return null;
  const user = await prisma.user.findUnique({
    where: { publicId: token },
    select: { id: true, name: true, avatarUrl: true, bio: true },
  });
  if (!user) return null;
  const [posts, likes, commentLikes, comments, lines] = await Promise.all([
    prisma.post.count({ where: { authorId: user.id } }),
    prisma.vote.count({ where: { userId: user.id } }),
    prisma.commentLike.count({ where: { userId: user.id } }),
    prisma.comment.count({ where: { userId: user.id } }),
    linesForUser(user.id),
  ]);
  return {
    name: displayName(user.name),
    avatarUrl: displayAvatar(user.avatarUrl),
    bio: displayBio(user.bio),
    posts,
    likes: likes + commentLikes,
    comments,
    lines,
  };
}

function displayName(value: string | null): string {
  if (!value) return "Reader";
  const opened = value.startsWith("v1.") ? reveal(value) : value;
  const name = opened.trim();
  return name && !name.includes("@") ? name : "Reader";
}

function displayBio(value: string | null): string | null {
  if (!value) return null;
  const opened = value.startsWith("v1.") ? reveal(value) : value;
  const text = opened.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return text ? [...text].slice(0, 280).join("") : null;
}

function displayAvatar(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;
  if (!value.startsWith("v1.")) return null;
  const opened = reveal(value);
  return opened.startsWith("data:image/") ? opened : null;
}
