import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { WatchFeed } from "@/components/WatchFeed";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail, getWatchQueue, type PostDetail } from "@/lib/feed";
import { mixSeed } from "@/lib/mix";
import { postJsonLd, postMetadata, type SeoPost } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await getCurrentUser();
  const post = await getPostDetail(slug, user?.id);
  if (!post) return { title: "Missing post", robots: { index: false, follow: false } };
  return postMetadata(toSeo(post));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const queue = await getWatchQueue(slug, user?.id, [], mixSeed());
  if (!queue) notFound();

  const start = queue.posts[queue.startIndex] ?? queue.posts[0];
  if (!start) notFound();
  if (slug !== start.slug) permanentRedirect(`/posts/${start.slug}`);

  return (
    <>
      <JsonLd data={postJsonLd(start)} />
      <WatchFeed
        posts={queue.posts}
        startIndex={queue.startIndex}
        initialCursor={queue.nextCursor}
        mix={queue.mix}
        filter="all"
        authenticated={Boolean(user)}
      />
    </>
  );
}

function toSeo(post: PostDetail): SeoPost {
  return {
    title: post.title,
    slug: post.slug,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    embedUrl: post.embedUrl,
    thumbnailUrl: post.thumbnailUrl,
    category: post.category,
    createdAt: post.createdAt,
    format: post.format,
    tldr: post.remix?.tldr ?? null,
  };
}
