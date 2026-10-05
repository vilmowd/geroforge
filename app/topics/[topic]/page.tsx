import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShelfScreen } from "@/components/ShelfScreen";
import { topicFromSlug } from "@/lib/topics";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = topicFromSlug(slug);
  if (!topic) return { title: "Topic", robots: { index: false, follow: false } };
  return {
    title: topic.title,
    description: topic.description,
    alternates: { canonical: `/topics/${topic.slug}` },
  };
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params;
  const topic = topicFromSlug(slug);
  if (!topic) notFound();
  return (
    <ShelfScreen category={topic.category} heading={topic.title} />
  );
}
