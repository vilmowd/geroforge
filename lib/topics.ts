export const TOPICS = [
  {
    slug: "ai",
    category: "AI",
    title: "AI",
    description: "Fresh public AI videos, reels, and short original notes from the sources people are opening today.",
  },
  {
    slug: "development",
    category: "Development",
    title: "Development",
    description: "Fresh public programming videos and short original notes from today's developer sources.",
  },
  {
    slug: "science",
    category: "Science",
    title: "Science",
    description: "Fresh public science videos, explainers, and short original notes linked back to the source.",
  },
  {
    slug: "entertainment",
    category: "Entertainment",
    title: "Entertainment",
    description: "Fresh public entertainment videos, reels, and short original notes from what is moving today.",
  },
  {
    slug: "technology",
    category: "Technology",
    title: "Technology",
    description: "Fresh public technology stories, videos, and short original notes linked back to the source.",
  },
  {
    slug: "world",
    category: "World",
    title: "World",
    description: "Fresh public world news and short original notes from the outlets moving today.",
  },
] as const;

export type Topic = (typeof TOPICS)[number];

export function topicFromSlug(slug: string): Topic | null {
  return TOPICS.find((topic) => topic.slug === slug) ?? null;
}
