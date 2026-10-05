import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, siteUrl } from "@/lib/seo";
import { TOPICS } from "@/lib/topics";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const freshSince = new Date(Date.now() - 14 * 86_400_000);
  const posts = await prisma.post.findMany({
    where: { createdAt: { gte: freshSince } },
    select: { publicId: true, createdAt: true, thumbnailUrl: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return [
    { url: siteUrl(), changeFrequency: "hourly", priority: 1 },
    ...["/videos", "/reels", "/news", "/world", "/articles", "/posts"].map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    ...TOPICS.map((topic) => ({
      url: absoluteUrl(`/topics/${topic.slug}`),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/copyright"), changeFrequency: "yearly", priority: 0.2 },
    ...posts.map((post) => {
      const hours = (Date.now() - post.createdAt.getTime()) / 3_600_000;
      const fresh = hours < 48;
      return {
        url: absoluteUrl(`/posts/${post.publicId}`),
        lastModified: post.createdAt,
        changeFrequency: fresh ? ("hourly" as const) : ("daily" as const),
        priority: fresh ? 0.9 : 0.6,
        images: post.thumbnailUrl ? [post.thumbnailUrl] : undefined,
      };
    }),
  ];
}
