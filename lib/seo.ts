import type { Metadata } from "next";

export type SeoPost = {
  title: string;
  slug: string;
  sourceName: string;
  sourceUrl: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  category: string;
  createdAt: string;
  format: string;
  tldr: string | null;
};

export function siteUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function clipDescription(value: string, max = 158): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > 90 ? cut.slice(0, space) : cut).trim()}…`;
}

export function postDescription(post: Pick<SeoPost, "title" | "sourceName" | "tldr">): string {
  const note = post.tldr && post.tldr !== post.title ? post.tldr : "";
  const base = note || `${post.title}. A short original note from a public item on ${post.sourceName}.`;
  return clipDescription(base);
}

function isVideo(post: Pick<SeoPost, "format" | "embedUrl">): boolean {
  return Boolean(post.embedUrl) && (post.format === "video" || post.format === "reel");
}

export function postMetadata(post: SeoPost): Metadata {
  const description = postDescription(post);
  const url = absoluteUrl(`/posts/${post.slug}`);
  const video = isVideo(post);
  const image = post.thumbnailUrl ? [{ url: post.thumbnailUrl, alt: post.title }] : undefined;

  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: {
      type: video ? "video.other" : "article",
      url,
      title: post.title,
      description,
      siteName: "GeroForge",
      publishedTime: post.createdAt,
      images: image,
    },
    twitter: {
      card: post.thumbnailUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: post.thumbnailUrl ? [post.thumbnailUrl] : undefined,
    },
  };
}

export function postJsonLd(post: SeoPost): Record<string, unknown> {
  const pageUrl = absoluteUrl(`/posts/${post.slug}`);
  const description = postDescription(post);
  const video = isVideo(post);
  const articleType = post.format === "news" ? "NewsArticle" : "Article";
  const article: Record<string, unknown> = {
    "@type": articleType,
    headline: post.title,
    description,
    datePublished: post.createdAt,
    dateModified: post.createdAt,
    articleSection: post.category,
    inLanguage: "en",
    mainEntityOfPage: pageUrl,
    isAccessibleForFree: true,
    author: { "@type": "Organization", name: post.sourceName },
    publisher: { "@type": "Organization", name: "GeroForge", url: siteUrl() },
  };
  if (post.thumbnailUrl) article.image = [post.thumbnailUrl];
  if (post.sourceUrl) article.citation = post.sourceUrl;

  const graph: Record<string, unknown>[] = [article];
  if (video && post.embedUrl) {
    graph.push({
      "@type": "VideoObject",
      name: post.title,
      description,
      thumbnailUrl: post.thumbnailUrl ? [post.thumbnailUrl] : undefined,
      uploadDate: post.createdAt,
      embedUrl: post.embedUrl,
      url: pageUrl,
      publisher: { "@type": "Organization", name: "GeroForge" },
      creator: { "@type": "Organization", name: post.sourceName },
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GeroForge",
    url: siteUrl(),
    description: "A swipeable shelf of public videos, reels, news, and short original notes, each linked back to its source.",
    inLanguage: "en",
  };
}

export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
