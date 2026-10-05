import { clip, collapse, stripTags } from "@/lib/text";

const BOILERPLATE = /cookie|subscribe|newsletter|sign up|all rights reserved|privacy policy|enable javascript/i;

export function extractArticle(html: string): { title: string | null; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? clip(stripTags(titleMatch[1]), 180) : null;
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((paragraph) => paragraph.length >= 70 && !BOILERPLATE.test(paragraph))
    .slice(0, 12);

  const text = paragraphs.join("\n\n");
  if (text.length >= 80) return { title, text: clip(text, 4000) };

  const fallback = clip(stripTags(html), 4000);
  return { title, text: fallback.length >= 80 ? fallback : text };
}

export function collapseTitle(value: string): string {
  return clip(collapse(stripTags(value)), 180);
}
