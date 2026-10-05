import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

const ADJECTIVES = [
  "Amber",
  "Bold",
  "Bright",
  "Calm",
  "Clever",
  "Cosmic",
  "Curious",
  "Daring",
  "Gentle",
  "Golden",
  "Happy",
  "Hidden",
  "Jolly",
  "Kind",
  "Lively",
  "Lucky",
  "Merry",
  "Noble",
  "Quiet",
  "Rapid",
  "Silver",
  "Sunny",
  "Swift",
  "Witty",
];

const NOUNS = [
  "Badger",
  "Comet",
  "Falcon",
  "Fern",
  "Harbor",
  "Heron",
  "Island",
  "Lantern",
  "Maple",
  "Mosaic",
  "Otter",
  "Pebble",
  "Pioneer",
  "Quill",
  "River",
  "Rocket",
  "Sparrow",
  "Summit",
  "Thunder",
  "Voyager",
  "Willow",
];

export async function uniqueUsername(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const name = `${ADJECTIVES[randomInt(ADJECTIVES.length)]}${NOUNS[randomInt(NOUNS.length)]}${randomInt(1000, 10000)}`;
    const taken = await prisma.user.findFirst({ where: { name }, select: { id: true } });
    if (!taken) return name;
  }
  return `Reader${randomInt(100000, 1000000)}`;
}
