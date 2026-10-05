import type { ShelfFormat } from "@/lib/remixer";

export function posterPalette(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0;
  }
  const hue = hash % 360;
  return { hue, hue2: (hue + 38) % 360 };
}

function posterWords(title: string): string[] {
  const parts = title
    .replace(/https?:\/\/\S+/gi, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ""))
    .filter(Boolean);
  const strong = parts.filter((word) => word.length > 2);
  const chosen = (strong.length >= 2 ? strong : parts).slice(0, 3);
  return chosen.length > 0 ? chosen : ["Story"];
}

export function ContentPoster({
  title,
  category,
  format,
  showTitle = false,
  decorative = false,
}: {
  title: string;
  category: string;
  format: ShelfFormat;
  showTitle?: boolean;
  decorative?: boolean;
}) {
  const words = posterWords(title).slice(0, 2);
  const { hue, hue2 } = posterPalette(`${format}:${category}:${title}`);
  return (
    <div
      className="content-poster"
      style={{
        background: `linear-gradient(150deg, hsl(${hue} 68% 42%) 0%, hsl(${hue2} 62% 24%) 100%)`,
      }}
      aria-hidden="true"
    >
      <span className="poster-orb" />
      <span className="poster-orb poster-orb-b" />
      {decorative ? null : showTitle ? <span className="poster-title">{title}</span> : <span className="poster-mark">{words.join(" ")}</span>}
    </div>
  );
}
