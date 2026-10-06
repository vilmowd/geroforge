import { DESKS } from "@/lib/pipeline";

const LINES: Record<(typeof DESKS)[number], string> = {
  AI: "The AI desk. What the labs shipped, with the original still linked.",
  Development: "The Development desk. The code and the tools, and the page they came from.",
  Science: "The Science desk. The finding first. The paper stays at the source.",
  Entertainment: "The Entertainment desk. The clip and the show, played from the source.",
  Technology: "The Technology desk. What changed in the tools people actually use.",
  World: "The World desk. The report, with the outlet one tap away.",
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
  };
  const desk = named[filter];
  return desk && deskLine(desk) ? desk : null;
}
