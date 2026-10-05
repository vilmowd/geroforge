export {};

async function main() {
  const { loadEnvFile } = await import("../lib/load-env");
  loadEnvFile();
  const { inferFormat, remixText } = await import("../lib/remixer");
  const { prisma } = await import("../lib/prisma");
  const posts = await prisma.post.findMany();
  for (const post of posts) {
    const stored = post.remixedContent && typeof post.remixedContent === "object" && "format" in post.remixedContent
      ? String((post.remixedContent as { format?: string }).format)
      : "";
    const inferred = inferFormat({
      contentType: post.contentType,
      sourceName: post.sourceName,
      sourceUrl: post.sourceUrl,
      embedUrl: post.embedUrl,
      category: post.category,
    });
    const format = stored === "reel" && inferred === "video" ? "reel" : inferred;
    const mixed = remixText({
      title: post.title,
      text: post.rawContent || post.title,
      categoryHint: post.category,
      format,
    });
    await prisma.post.update({
      where: { id: post.id },
      data: {
        category: mixed.category,
        remixedContent: {
          tldr: mixed.remix.tldr,
          markdown: mixed.remix.markdown,
          keywords: mixed.remix.keywords,
          stats: mixed.remix.stats,
          format,
        },
      },
    });
  }
  console.log(`refreshed ${posts.length} notes`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
