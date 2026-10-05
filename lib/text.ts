export function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number(code);
      return point > 0 && point < 65536 ? String.fromCharCode(point) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const point = Number.parseInt(code, 16);
      return point > 0 && point < 65536 ? String.fromCharCode(point) : "";
    });
}

export function stripTags(value: string): string {
  return collapse(
    decodeEntities(value)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

export function clip(value: string, max: number): string {
  const clean = value.trim();
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max);
  const boundary = sliced.lastIndexOf(" ");
  const base = boundary > max * 0.6 ? sliced.slice(0, boundary) : sliced;
  return `${base.trimEnd()}…`;
}
