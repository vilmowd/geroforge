import { youtubePoster } from "../lib/embed";
import { prisma } from "../lib/prisma";
import { SOURCES } from "../lib/sources";
import { imageFromMarkup } from "../lib/thumbnails";
import { fetchPublicBody } from "../lib/url-safety";

const FEEDS = SOURCES.map((source) => source.url);

function feedImages(xml: string): Map<string, string> {
  const found = new Map<string, string>();
  const chunks = xml.split(/<(?:item|entry)\b[^>]*>/i).slice(1);
  for (const chunk of chunks) {
    const block = chunk.split(/<\/(?:item|entry)>/i)[0] || chunk;
    const image = imageFromMarkup(block);
    if (!image) continue;
    const links = [...block.matchAll(/https?:\/\/[^"'<\s]+/gi)].map((match) => match[0].replace(/&amp;/g, "&"));
    for (const link of links) {
      const poster = youtubePoster(link);
      found.set(normalize(link), image || poster || "");
    }
    if (image) {
      for (const link of links) found.set(normalize(link), image);
    }
  }
  return found;
}

function normalize(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

async function main() {
  const fromFeeds = new Map<string, string>();
  for (const feed of FEEDS) {
    try {
      const page = await fetchPublicBody(feed, "feed");
      for (const [link, image] of feedImages(page.body)) {
        if (image) fromFeeds.set(link, image);
      }
    } catch (error) {
      console.info("[thumbs] feed skip", feed, error instanceof Error ? error.message : error);
    }
  }

  const posts = await prisma.post.findMany({
    where: { thumbnailUrl: null },
    select: { id: true, sourceUrl: true, embedUrl: true },
  });
  let filled = 0;
  for (const post of posts) {
    const keys = [post.embedUrl, post.sourceUrl].filter((value): value is string => Boolean(value)).map(normalize);
    const direct = youtubePoster(post.embedUrl) || youtubePoster(post.sourceUrl);
    let thumbnail = direct || keys.map((key) => fromFeeds.get(key)).find(Boolean) || null;
    if (!thumbnail && post.sourceUrl && !post.embedUrl && !post.sourceUrl.includes("example.com")) {
      try {
        const page = await fetchPublicBody(post.sourceUrl, "article");
        thumbnail = imageFromMarkup(page.body);
      } catch (error) {
        console.info("[thumbs] skip", post.sourceUrl, error instanceof Error ? error.message : error);
      }
    }
    if (!thumbnail) continue;
    await prisma.post.update({ where: { id: post.id }, data: { thumbnailUrl: thumbnail } });
    filled += 1;
  }
  console.info(`[thumbs] filled ${filled} of ${posts.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
