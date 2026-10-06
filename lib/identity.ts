import type { User } from "@prisma/client";
import { emailKey, reveal, seal } from "@/lib/seal";
import { prisma } from "@/lib/prisma";

export function presentUser<T extends User>(user: T): T {
  return {
    ...user,
    email: reveal(user.email),
    name: user.name ? (user.name.startsWith("v1.") ? reveal(user.name) || "Reader" : user.name) : user.name,
    avatarUrl: revealAvatar(user.avatarUrl),
    bio: revealBio(user.bio),
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const hash = emailKey(normalized);
  let row = await prisma.user.findUnique({ where: { emailHash: hash } });
  if (!row) {
    row = await prisma.user.findUnique({ where: { email: normalized } });
    if (row) row = await persistSeal(row);
  }
  return row ? presentUser(row) : null;
}

export async function persistSeal(user: User): Promise<User> {
  if (!needsSeal(user)) return user;
  const email = reveal(user.email);
  const name = user.name ? reveal(user.name) : null;
  if (!email.includes("@")) return user;
  const avatar = user.avatarUrl?.startsWith("data:image/") ? seal(user.avatarUrl) : user.avatarUrl;
  return prisma.user.update({
    where: { id: user.id },
    data: {
      email: user.email.startsWith("v1.") ? user.email : seal(email),
      emailHash: user.emailHash || emailKey(email),
      name: !name ? name : user.name?.startsWith("v1.") ? user.name : seal(name),
      nameHash: name ? emailKey(name.trim().toLowerCase()) : user.nameHash,
      avatarUrl: avatar,
      bio: !user.bio || user.bio.startsWith("v1.") ? user.bio : seal(user.bio),
    },
  });
}

export function packMagicEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return `${emailKey(normalized)}:${seal(normalized)}`;
}

export function unpackMagicEmail(stored: string): string | null {
  const cut = stored.indexOf(":");
  if (cut === -1) return stored.includes("@") ? stored : null;
  const sealed = stored.slice(cut + 1);
  if (!sealed.startsWith("v1.")) return stored.includes("@") ? stored : null;
  const opened = reveal(sealed);
  return opened.includes("@") ? opened : null;
}

function needsSeal(user: User): boolean {
  return !user.email.startsWith("v1.") || !user.emailHash || Boolean(user.name && !user.name.startsWith("v1.")) || Boolean(user.name && !user.nameHash) || Boolean(user.avatarUrl?.startsWith("data:image/")) || Boolean(user.bio && !user.bio.startsWith("v1."));
}

function revealBio(value: string | null): string | null {
  if (!value) return null;
  const opened = value.startsWith("v1.") ? reveal(value) : value;
  const text = opened.trim();
  return text || null;
}

function revealAvatar(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;
  if (!value.startsWith("v1.")) return null;
  const opened = reveal(value);
  return opened.startsWith("data:image/") ? opened : null;
}
