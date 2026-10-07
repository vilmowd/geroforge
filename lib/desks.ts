import { DESKS } from "@/lib/pipeline";

const LINES: Record<(typeof DESKS)[number], string> = {
  AI: "The AI desk. What the labs shipped, with the original still linked.",
  Development: "The Development desk. The code and the tools, and the page they came from.",
  Science: "The Science desk. The finding first. The paper stays at the source.",
  Entertainment: "The Entertainment desk. The clip and the show, played from the source.",
  Technology: "The Technology desk. What changed in the tools people actually use.",
  World: "The World desk. The report, with the outlet one tap away.",
  Sports: "The Sports desk. The game and the clip, played from the source.",
  Space: "The Space desk. The mission first. The original stays linked.",
  Culture: "The Culture desk. The film, the making, and the page it came from.",
  Business: "The Business desk. The deal and the number, with the source still open.",
  Health: "The Health desk. The finding first. The study stays at the source.",
  Climate: "The Climate desk. The report, with the outlet one tap away.",
};

export function deskLine(category: string): string | null {
  if (!DESKS.includes(category as (typeof DESKS)[number])) return null;
  return LINES[category as (typeof DESKS)[number]];
}

export function deskForFilter(filter: string, category?: string): string | null {
  if (category && deskLine(category)) return category;
  const named: Record<string, string> = {
    world: "World",
    technology: "Technology",
    science: "Science",
    ai: "AI",
    development: "Development",
    sports: "Sports",
    space: "Space",
    culture: "Culture",
    business: "Business",
    health: "Health",
    climate: "Climate",
  };
  const desk = named[filter];
  return desk && deskLine(desk) ? desk : null;
}
