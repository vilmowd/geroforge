export {};

async function main() {
  const { loadEnvFile } = await import("../lib/load-env");
  loadEnvFile();
  const { assertPublicHttpUrl } = await import("../lib/url-safety");
  const { IngestError } = await import("../lib/errors");
  const { prisma } = await import("../lib/prisma");
  const { publishExternalUrl } = await import("../lib/scraper");

  let blocked = false;
  try {
    await assertPublicHttpUrl("http://127.0.0.1/secret");
  } catch (error) {
    blocked = error instanceof IngestError;
  }
  if (!blocked) throw new Error("private addresses must be rejected");

  await prisma.post.deleteMany({
    where: { sourceUrl: { contains: "jNQXAC9IVRw" } },
  });
  await prisma.post.deleteMany({
    where: { OR: [{ sourceUrl: "https://youtu.be/jNQXAC9IVRw" }, { title: "Me at the zoo" }] },
  });

  const user = await prisma.user.findUnique({ where: { email: "reader@example.com" } });
  if (!user) throw new Error("reader is missing");

  const result = await publishExternalUrl({
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    sourceName: "Community",
    isAutomated: false,
    authorId: user.id,
  });
  if (result.status !== "created") throw new Error(`expected created, got ${JSON.stringify(result)}`);

  const post = await prisma.post.findUnique({ where: { slug: result.slug } });
  if (!post || post.contentType !== "VIDEO_EMBED" || post.isAutomated || !post.embedUrl?.includes("youtube-nocookie.com/embed/jNQXAC9IVRw")) {
    throw new Error(`unexpected post ${JSON.stringify(post)}`);
  }

  const duplicate = await publishExternalUrl({
    url: "https://youtu.be/jNQXAC9IVRw",
    sourceName: "Community",
    isAutomated: false,
    authorId: user.id,
  });
  if (duplicate.status !== "duplicate") throw new Error(`expected duplicate, got ${JSON.stringify(duplicate)}`);

  console.log(`published ${post.slug} :: ${post.title}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
