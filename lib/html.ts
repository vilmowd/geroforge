import { clip, collapse, stripTags } from "@/lib/text";

const BOILERPLATE = /cookie|subscribe|newsletter|sign up|all rights reserved|privacy policy|enable javascript|advertisement|related articles|share this|follow us/i;
const DESK_NOTE = /written for the shelf|desk note|shelved under|full report stays at the source|geroForge's cut|plays the official embed|long thread stays on the source/i;

export function isDeskNote(value: string): boolean {
  return DESK_NOTE.test(value);
}

export function visibleLead(paragraphs: string[]): string {
  const text = paragraphs.join(" ").replace(/\s+/g, " ").trim();
  if (!text || DESK_NOTE.test(text)) return "";
  if (text.length <= 700) return text;
  const sliced = text.slice(0, 700);
  const boundary = sliced.lastIndexOf(" ");
  return (boundary > 420 ? sliced.slice(0, boundary) : sliced).trim();
}

export function leadParagraphs(source: string, title = ""): string[] {
  const article = source.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const fromArticle = article ? pickParagraphs(article[1], title) : [];
  if (fromArticle.length >= 2) return fromArticle;
  const main = source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const fromMain = main ? pickParagraphs(main[1], title) : [];
  if (fromMain.length > fromArticle.length) return fromMain;
  const fromPage = pickParagraphs(source, title);
  return fromPage.length > fromArticle.length ? fromPage : fromArticle;
}

function pickParagraphs(source: string, title: string): string[] {
  const cleaned = withoutNoise(source);
  const fromMarkup = [...cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => fitParagraph(match[1]));
  const candidates = fromMarkup.some(Boolean) ? fromMarkup : plainBlocks(cleaned).map((block) => fitParagraph(block));
  const heading = collapse(stripTags(title)).toLowerCase();
  const kept: string[] = [];
  for (const paragraph of candidates) {
    if (!paragraph) continue;
    if (BOILERPLATE.test(paragraph) || DESK_NOTE.test(paragraph)) continue;
    if (heading && paragraph.toLowerCase() === heading) continue;
    if (kept.some((item) => item === paragraph)) continue;
    kept.push(paragraph);
    if (kept.length === 5) break;
  }
  return kept;
}

function fitParagraph(value: string): string | null {
  const text = plainParagraph(value);
  if (text.length < 70) return null;
  if (text.length <= 520) return text;
  const sliced = text.slice(0, 520);
  const boundary = Math.max(sliced.lastIndexOf(". "), sliced.lastIndexOf("! "), sliced.lastIndexOf("? "));
  return (boundary > 180 ? sliced.slice(0, boundary + 1) : sliced).trim();
}

function plainParagraph(value: string): string {
  return collapse(stripTags(value.replace(/<br\s*\/?>/gi, " ")));
}

function plainBlocks(value: string): string[] {
  const text = collapse(stripTags(value));
  if (!text) return [];
  const blocks = text.split(/\n{2,}/).map((block) => collapse(block)).filter(Boolean);
  if (blocks.length > 1) return blocks;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z“"'])/);
  const grouped: string[] = [];
  for (let index = 0; index < sentences.length && grouped.length < 5; index += 2) {
    grouped.push(collapse(sentences.slice(index, index + 2).join(" ")));
  }
  return grouped;
}

function withoutNoise(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ");
}

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
