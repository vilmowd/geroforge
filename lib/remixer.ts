import { clip, collapse, stripTags } from "@/lib/text";

export type StatSpotlight = {
  value: string;
  label: string;
};

export type ShelfFormat = "video" | "reel" | "news" | "world" | "article" | "post";

export type RemixedContent = {
  tldr: string;
  stats: StatSpotlight[];
  markdown: string;
  keywords: string[];
  format?: ShelfFormat;
};

const FORMATS = new Set<ShelfFormat>(["video", "reel", "news", "world", "article", "post"]);

const CATEGORY_DICTIONARY: { category: string; words: string[] }[] = [
  {
    category: "AI",
    words: [
      "artificial intelligence",
      "machine learning",
      "language model",
      "large language",
      "llm",
      "gpt",
      "neural",
      "openai",
      "generative ai",
      "transformer",
    ],
  },
  {
    category: "Development",
    words: [
      "javascript",
      "typescript",
      "python",
      "rustlang",
      "github",
      "kubernetes",
      "compiler",
      "developer",
      "programming",
      "open source",
      "typecheck",
      "monorepo",
      "framework",
    ],
  },
  {
    category: "Science",
    words: [
      "researchers",
      "nasa",
      "physics",
      "biology",
      "climate",
      "quantum",
      "scientist",
      "journal",
      "experiment",
      "satellite",
    ],
  },
  {
    category: "Entertainment",
    words: [
      "film",
      "movie",
      "trailer",
      "music",
      "album",
      "celebrity",
      "tiktok",
      "gameplay",
      "box office",
      "short film",
    ],
  },
  {
    category: "Technology",
    words: [
      "software",
      "startup",
      "chip",
      "apple",
      "google",
      "microsoft",
      "security",
      "robot",
      "internet",
      "device",
      "semiconductor",
    ],
  },
  {
    category: "World",
    words: [
      "election",
      "border",
      "ceasefire",
      "parliament",
      "refugee",
      "united nations",
      "diplomat",
      "protest",
      "summit",
    ],
  },
];

const KNOWN_CATEGORIES = new Set(CATEGORY_DICTIONARY.map((entry) => entry.category));

const STAT_SOURCE =
  "\\$(?:\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)(?:\\s?(?:trillion|billion|million|thousand|bn|m|k))?|\\d+(?:\\.\\d+)?\\s?%|\\d+(?:\\.\\d+)?\\s?[x×](?=\\s|$|[.,;:)])|\\b\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?\\b";

export function remixText(input: {
  title: string;
  text: string;
  categoryHint?: string;
  format?: ShelfFormat;
}): {
  category: string;
  remix: RemixedContent;
} {
  const title = collapse(stripTags(input.title));
  const text = collapse(stripTags(input.text));
  const category = categorize(title, text, input.categoryHint);
  const format = input.format && FORMATS.has(input.format) ? input.format : "article";
  const stats = extractStats(text);
  const note = writeNote(title, format, category, stats);
  return {
    category,
    remix: {
      tldr: note.tldr,
      stats,
      markdown: note.markdown,
      keywords: extractKeywords(title, text),
      format,
    },
  };
}

export function inferFormat(input: {
  contentType: string;
  sourceName: string;
  sourceUrl?: string | null;
  embedUrl?: string | null;
  category?: string;
  stored?: string | null;
}): ShelfFormat {
  if (input.stored && FORMATS.has(input.stored as ShelfFormat)) return input.stored as ShelfFormat;
  const blob = `${input.sourceName} ${input.sourceUrl || ""} ${input.embedUrl || ""}`.toLowerCase();
  if (input.contentType === "VIDEO_EMBED") {
    if (/shorts|tiktok|instagram|\/reel/.test(blob)) return "reel";
    return "video";
  }
  if (blob.includes("reddit")) return "post";
  if (/bbc news|npr news|guardian/.test(blob)) return "news";
  if (input.category === "World" || /bbc world|al jazeera|wikipedia|on this day/.test(blob)) return "world";
  return "article";
}

export function readRemix(value: unknown): RemixedContent | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.tldr !== "string" || typeof record.markdown !== "string" || !Array.isArray(record.stats)) {
    return null;
  }

  const stats = record.stats.flatMap((stat) => {
    if (!stat || typeof stat !== "object") return [];
    const item = stat as Record<string, unknown>;
    if (typeof item.value !== "string" || typeof item.label !== "string") return [];
    return [{ value: item.value.slice(0, 48), label: item.label.slice(0, 180) }];
  });

  const keywords = Array.isArray(record.keywords)
    ? record.keywords.filter((word): word is string => typeof word === "string").slice(0, 8)
    : [];
  const format = typeof record.format === "string" && FORMATS.has(record.format as ShelfFormat)
    ? (record.format as ShelfFormat)
    : undefined;

  return {
    tldr: record.tldr.slice(0, 700),
    markdown: record.markdown.slice(0, 4000),
    stats: stats.slice(0, 3),
    keywords,
    format,
  };
}

function categorize(title: string, text: string, hint?: string): string {
  const fallback = hint && KNOWN_CATEGORIES.has(hint) ? hint : "Technology";
  const hay = `${title}\n${text}`.toLowerCase();
  let bestCategory = fallback;
  let bestScore = hint && KNOWN_CATEGORIES.has(hint) ? 1 : 0;

  for (const entry of CATEGORY_DICTIONARY) {
    let score = 0;
    for (const word of entry.words) {
      if (hay.includes(word)) score += word.length > 8 ? 2 : 1;
    }
    if (score > bestScore) {
      bestCategory = entry.category;
      bestScore = score;
    }
  }

  return bestCategory;
}

function extractKeywords(title: string, text: string): string[] {
  const hay = `${title}\n${text}`.toLowerCase();
  const found: string[] = [];
  for (const entry of CATEGORY_DICTIONARY) {
    for (const word of entry.words) {
      if (hay.includes(word) && !found.includes(word)) found.push(word);
    }
  }
  const stop = new Set(["with", "from", "that", "this", "after", "about", "their", "have", "will", "into", "over", "your", "what", "when"]);
  for (const word of title.toLowerCase().split(/[^a-z0-9+]+/)) {
    if (word.length < 4 || stop.has(word) || found.includes(word)) continue;
    found.push(word);
    if (found.length >= 8) break;
  }
  return found.slice(0, 8);
}

function extractStats(text: string): StatSpotlight[] {
  const pattern = new RegExp(STAT_SOURCE, "gi");
  const found: { value: string; label: string; weight: number; index: number }[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(pattern)) {
    const value = match[0].replace(/\s+/g, " ").trim();
    const key = value.toLowerCase().replace(/\s/g, "");
    if (!value || seen.has(key)) continue;
    seen.add(key);
    found.push({
      value,
      label: "Figure from the source",
      weight: statWeight(value),
      index: match.index ?? 0,
    });
  }

  return found
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .slice(0, 3)
    .map(({ value, label }) => ({ value, label }));
}

function statWeight(value: string): number {
  if (value.includes("%") || value.includes("$")) return 3;
  if (/[x×]/i.test(value)) return 2;
  return 1;
}

function writeNote(
  title: string,
  format: ShelfFormat,
  category: string,
  stats: StatSpotlight[],
): { tldr: string; markdown: string } {
  const subject = clip(title, 140);
  const turn = hashText(`${format}:${title}`) % 4;
  const frames = [
    `${subject} is on the ${category} desk today.`,
    `${category} shelf: ${subject}.`,
    `Fresh on the ${category} desk: ${subject}.`,
    `${subject} just landed in ${category}.`,
  ];
  const numbers = [stats[0]?.value, stats[1]?.value].filter((value): value is string => Boolean(value));
  const numberLine = numbers.length
    ? `The figure${numbers.length > 1 ? "s" : ""} to keep: ${numbers.join(" and ")}.`
    : format === "video" || format === "reel"
      ? "Watch the clip on this page. The file stays with the original host."
      : `Shelved under ${category}. The full report stays at the source.`;
  const close: Record<ShelfFormat, string> = {
    news: "News desk note. The original report is linked below.",
    world: "World desk note. The original report is linked below.",
    reel: "Reel cut. Play it here, then talk about it in the thread.",
    video: "Video cut. Play it here, then talk about it in the thread.",
    post: "Public discussion. The long thread stays on the source site.",
    article: `${category} desk note. This is GeroForge's cut, and the original is linked below.`,
  };
  const own =
    format === "video" || format === "reel"
      ? "GeroForge plays the official embed and keeps this short note. The media file stays on the original host."
      : `This ${category} note is written for the shelf. It is not a copy of the source, and the original stays linked.`;
  const lead = frames[turn] || frames[0];
  return {
    tldr: clip(`${lead} ${numberLine}`, 280),
    markdown: clip([lead, numberLine, own, close[format]].join("\n\n"), 700),
  };
}

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
