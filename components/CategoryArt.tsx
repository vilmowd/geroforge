import { Atom, Clapperboard, Code2, Cpu, Globe2, MessagesSquare, Newspaper, ScrollText, Sparkles } from "lucide-react";
import type { ShelfFormat } from "@/lib/remixer";

export function categoryIcon(category: string, format: ShelfFormat) {
  const name = category.toLowerCase();
  if (name === "science") return Atom;
  if (name === "ai") return Sparkles;
  if (name === "development") return Code2;
  if (name === "technology") return Cpu;
  if (name === "entertainment") return Clapperboard;
  if (name === "world" || format === "world") return Globe2;
  if (format === "news") return Newspaper;
  if (format === "post") return MessagesSquare;
  if (format === "article") return ScrollText;
  return Clapperboard;
}

export function CategoryArt({
  category,
  format,
  className = "h-14 w-14",
}: {
  category: string;
  format: ShelfFormat;
  className?: string;
}) {
  const Icon = categoryIcon(category, format);
  return (
    <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
      <Icon className={className} />
    </span>
  );
}
