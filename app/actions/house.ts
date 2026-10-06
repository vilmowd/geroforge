"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { cleanSourceName, knownDesk } from "@/lib/follows";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export type HouseState = { error: string; on?: boolean };

export async function setFollow(kind: "desk" | "source", value: string): Promise<HouseState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to follow a desk." };
  if (!rateLimit(`follow:${user.id}`, 40, 10 * 60 * 1000)) return { error: "Too many follows. Try again shortly." };
  if (kind === "desk") {
    const desk = knownDesk(value);
    if (!desk) return { error: "That desk is not on the shelf." };
    const existing = await prisma.deskFollow.findUnique({
      where: { userId_desk: { userId: user.id, desk } },
      select: { id: true },
    });
    if (existing) {
      await prisma.deskFollow.delete({ where: { id: existing.id } });
      revalidatePath("/", "layout");
      return { error: "", on: false };
    }
    await prisma.deskFollow.create({ data: { userId: user.id, desk } });
    revalidatePath("/", "layout");
    return { error: "", on: true };
  }
  const sourceName = cleanSourceName(value);
  if (!sourceName) return { error: "That source name does not fit." };
  const existing = await prisma.sourceFollow.findUnique({
    where: { userId_sourceName: { userId: user.id, sourceName } },
    select: { id: true },
  });
  if (existing) {
    await prisma.sourceFollow.delete({ where: { id: existing.id } });
    revalidatePath("/", "layout");
    return { error: "", on: false };
  }
  await prisma.sourceFollow.create({ data: { userId: user.id, sourceName } });
  revalidatePath("/", "layout");
  return { error: "", on: true };
}
