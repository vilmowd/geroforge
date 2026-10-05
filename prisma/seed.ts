import { randomBytes } from "crypto";

export {};

async function main() {
  const { loadEnvFile } = await import("../lib/load-env");
  loadEnvFile();
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed while NODE_ENV is production.");
  }
  const { prisma } = await import("../lib/prisma");
  const { remixText } = await import("../lib/remixer");
  const { emailKey, seal } = await import("../lib/seal");
  const { newPublicId } = await import("../lib/public-id");

  const reader = await prisma.user.upsert({
    where: { emailHash: emailKey("reader@example.com") },
    update: {},
    create: {
      publicId: newPublicId(),
      email: seal("reader@example.com"),
      emailHash: emailKey("reader@example.com"),
      name: seal("Reader"),
    },
  });
  const editor = await prisma.user.upsert({
    where: { emailHash: emailKey("editor@example.com") },
    update: {},
    create: {
      publicId: newPublicId(),
      email: seal("editor@example.com"),
      emailHash: emailKey("editor@example.com"),
      name: seal("Editor"),
    },
  });

  const starters = [
    {
      slug: "starter-cloud-spend",
      title: "Cloud bills are consolidating faster than the tooling",
      sourceUrl: "https://example.com/forge/cloud-spend",
      sourceName: "Starter desk",
      categoryHint: "Technology",
      contentType: "ARTICLE" as const,
      hoursAgo: 6,
      upvotes: 4,
      text: "Public cloud spend reached $270 billion last year, up 18% as platform teams folded 3x more workloads onto fewer vendors. Finance groups asked for a single bill, and engineering groups asked for fewer consoles. This starter note tracks the consolidation pattern, not a vendor announcement.",
    },
    {
      slug: "starter-language-model-eval",
      title: "A language model eval moved, and the second chart did not",
      sourceUrl: "https://example.com/forge/eval-gap",
      sourceName: "Starter desk",
      categoryHint: "AI",
      contentType: "ARTICLE" as const,
      hoursAgo: 10,
      upvotes: 3,
      text: "A lab's language model eval set moved 42% after a prompt rewrite, while the training run still cost $1.4 million. The gain showed up on summarization and disappeared on planning tasks. Teams that publish only the headline number are skipping the second chart.",
    },
    {
      slug: "starter-coastal-melt",
      title: "Satellite frames show a faster summer along one shelf",
      sourceUrl: "https://example.com/forge/ice-sheet",
      sourceName: "Starter desk",
      categoryHint: "Science",
      contentType: "ARTICLE" as const,
      hoursAgo: 20,
      upvotes: 2,
      text: "Researchers tracking 400,000 satellite frames estimated an 11% faster summer melt along one coastal shelf. The sample covers three seasons and leaves winter ice mostly untouched. The figure is a starter-desk illustration for the feed, not a journal paper.",
    },
    {
      slug: "starter-typecheck-cache",
      title: "Caching typecheck cut the cold start out of review",
      sourceUrl: "https://example.com/forge/build-times",
      sourceName: "Starter desk",
      categoryHint: "Development",
      contentType: "ARTICLE" as const,
      hoursAgo: 30,
      upvotes: 5,
      text: "A monorepo build dropped to a 2.5x shorter path after the team cached typecheck results, and 70% of pull requests stopped waiting on a cold start. The change was a config diff, not a new framework. Reviewers noticed the queue before they noticed the graph.",
    },
    {
      slug: "starter-big-buck-bunny",
      title: "Big Buck Bunny, embedded, not hosted",
      sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      sourceName: "YouTube",
      categoryHint: "Entertainment",
      contentType: "VIDEO_EMBED" as const,
      embedUrl: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
      hoursAgo: 1,
      upvotes: 1,
      text: "Big Buck Bunny is the Blender Foundation's open short film. GeroForge embeds the YouTube player and stores the reference, not the video file. The clip runs about ten minutes and is here so the media view has something real to play.",
    },
    {
      slug: "starter-local-first-notes",
      title: "A local-first notes app stopped merging cursors",
      sourceUrl: "https://example.com/forge/local-first",
      sourceName: "Community",
      categoryHint: "Technology",
      contentType: "ARTICLE" as const,
      hoursAgo: 3,
      upvotes: 2,
      isAutomated: false,
      authorId: reader.id,
      text: "A local-first notes app cut sync conflicts by 64% after it stopped merging cursors in real time. The changelog is short: write locally, sync documents, and leave the caret alone. This card stands in for a community submission.",
    },
  ];

  let cloudId: string | null = null;

  for (const starter of starters) {
    const mixed = remixText({
      title: starter.title,
      text: starter.text,
      categoryHint: starter.categoryHint,
    });
    const post = await prisma.post.upsert({
      where: { sourceUrl: starter.sourceUrl },
      update: {},
      create: {
        title: starter.title,
        slug: starter.slug,
        publicId: randomBytes(16).toString("hex"),
        contentType: starter.contentType,
        sourceUrl: starter.sourceUrl,
        sourceName: starter.sourceName,
        embedUrl: "embedUrl" in starter ? starter.embedUrl : null,
        category: mixed.category,
        rawContent: starter.text,
        remixedContent: {
          tldr: mixed.remix.tldr,
          markdown: mixed.remix.markdown,
          keywords: mixed.remix.keywords,
          stats: mixed.remix.stats,
        },
        upvotesCount: starter.upvotes,
        commentCount: 0,
        isAutomated: starter.isAutomated ?? true,
        authorId: starter.authorId ?? null,
        createdAt: new Date(Date.now() - starter.hoursAgo * 60 * 60 * 1000),
      },
    });
    if (starter.slug === "starter-cloud-spend") cloudId = post.id;
  }

  if (cloudId) {
    const existingVote = await prisma.vote.findUnique({
      where: { userId_postId: { userId: reader.id, postId: cloudId } },
    });
    if (!existingVote) {
      await prisma.vote.create({ data: { userId: reader.id, postId: cloudId, value: 1 } });
    }

    const commentCount = await prisma.comment.count({ where: { postId: cloudId } });
    if (commentCount === 0) {
      const top = await prisma.comment.create({
        data: {
          postId: cloudId,
          userId: editor.id,
          content: "The 3x claim is the part I want a source for. The bill consolidation story matches what our team saw last quarter.",
        },
      });
      await prisma.comment.create({
        data: {
          postId: cloudId,
          userId: reader.id,
          parentId: top.id,
          content: "Agreed. The stat cards make that number louder than the caveat underneath.",
        },
      });
      await prisma.post.update({ where: { id: cloudId }, data: { commentCount: 2 } });
      await prisma.user.update({ where: { id: editor.id }, data: { karma: { increment: 1 } } });
    }
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
