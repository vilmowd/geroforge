import { leadParagraphs } from "../lib/html";
import { prisma } from "../lib/prisma";
import { fetchPublicBody } from "../lib/url-safety";

const VIDEO_HOST = /youtube\.com|youtu\.be|tiktok\.com|instagram\.com|vimeo\.com/i;

function redditTextUrl(url: string): string {
  if (!/reddit\.com/i.test(url)) return url;
  return url.replace(/\/$/, "") + ".json";
}

function redditSelfText(body: string): string {
  try {
    const payload = JSON.parse(body) as { data?: { children?: { data?: { selftext?: string } }[] } }[];
    return payload?.[0]?.data?.children?.[0]?.data?.selftext || "";
  } catch {
    return "";
  }
}

async function main() {
  const posts = await prisma.post.findMany({
    where: { embedUrl: null },
    select: { id: true, title: true, sourceUrl: true, remixedContent: true },
  });
  const queue = posts.filter((post) => {
    const remix = post.remixedContent as { opening?: unknown } | null;
    const have = Array.isArray(remix?.opening) ? remix.opening.length : 0;
    return Boolean(post.sourceUrl) && have < 2;
  });

  let updated = 0;
  let missed = 0;
  let skipped = 0;
  for (let index = 0; index < queue.length; index += 4) {
    const batch = queue.slice(index, index + 4);
    const results = await Promise.all(batch.map((post) => fillLead(post)));
    for (const result of results) {
      if (result === "updated") updated += 1;
      else if (result === "skipped") skipped += 1;
      else missed += 1;
    }
  }

  console.log(`lead backfill updated=${updated} missed=${missed} skipped=${skipped} considered=${queue.length}`);
  await prisma.$disconnect();
}

async function fillLead(post: {
  id: string;
  title: string;
  sourceUrl: string | null;
  remixedContent: unknown;
}): Promise<"updated" | "missed" | "skipped"> {
  if (!post.sourceUrl || VIDEO_HOST.test(post.sourceUrl)) return "skipped";
  try {
    const page = await fetchPublicBody(redditTextUrl(post.sourceUrl), /reddit\.com/i.test(post.sourceUrl) ? "feed" : "article");
    const source = /reddit\.com/i.test(post.sourceUrl) ? redditSelfText(page.body) : page.body;
    const opening = leadParagraphs(source, post.title);
    if (opening.length === 0) return "missed";
    const current =
      post.remixedContent && typeof post.remixedContent === "object" && !Array.isArray(post.remixedContent)
        ? post.remixedContent
        : {};
    await prisma.post.update({
      where: { id: post.id },
      data: { remixedContent: { ...current, opening } },
    });
    return "updated";
  } catch {
    return "missed";
  }
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : "backfill failed");
  await prisma.$disconnect();
  process.exit(1);
});
