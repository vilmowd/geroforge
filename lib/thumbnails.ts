import { decodeEntities } from "@/lib/text";

const JUNK = /favicon|sprite|pixel|spacer|1x1|badge|emoji|tracking|feedburner|logo-rss|blank\.gif/i;

export function httpsImage(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = decodeEntities(value).trim().replace(/^['"]|['"]$/g, "");
  try {
    const url = new URL(cleaned);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (JUNK.test(`${url.pathname}${url.search}`)) return null;
    if (/\.(mp4|webm|mp3|m3u8|m4a)(\?|$)/i.test(url.pathname)) return null;
    const href = url.toString();
    return href.length <= 800 ? href : null;
  } catch {
    return null;
  }
}

const IMAGE_PATTERNS = [
  /<media:thumbnail\b[^>]*\burl=["']([^"']+)["']/gi,
  /<media:content\b[^>]*\burl=["']([^"']+)["'][^>]*>/gi,
  /<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*>/gi,
  /<itunes:image\b[^>]*\bhref=["']([^"']+)["']/gi,
  /<(?:image|logo)\b[^>]*>\s*<url>([^<]+)<\/url>/gi,
  /property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/gi,
  /content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/gi,
  /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/gi,
  /content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/gi,
  /<img\b[^>]*\bsrc=["']([^"']+)["']/gi,
];

const PAGE_IMAGE_PATTERNS = IMAGE_PATTERNS.slice(5, 9);

export function imageFromMarkup(markup: string): string | null {
  const found = collectImages(markup, IMAGE_PATTERNS);
  return found.length ? sharpestSibling(found) : null;
}

export function openGraphImage(markup: string): string | null {
  const found = collectImages(markup, PAGE_IMAGE_PATTERNS);
  if (!found.length) return null;
  return found.reduce((best, image) => (declaredWidth(image) > declaredWidth(best) ? image : best));
}

function collectImages(markup: string, patterns: RegExp[]): string[] {
  const found: string[] = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of markup.matchAll(pattern)) {
      const raw = match[1];
      const around = markup.slice(Math.max(0, (match.index || 0) - 40), (match.index || 0) + match[0].length + 80);
      if (/type=["'](?:video|audio)\//i.test(around)) continue;
      if (/<enclosure\b/i.test(match[0]) && !/image\/|og:image|\.(?:jpe?g|png|webp|gif)/i.test(around + raw)) {
        continue;
      }
      const image = httpsImage(raw);
      if (image) found.push(image);
    }
  }
  return found;
}

const YOUTUBE_STILL = /i\d*\.ytimg\.com\/vi\/([\w-]{11})\//i;

export function declaredWidth(image: string): number {
  try {
    const url = new URL(image);
    const query = Number(url.searchParams.get("width") || url.searchParams.get("w") || "0");
    const bbc = Number(url.pathname.match(/\/ace\/(?:standard|branded_news|ws)\/(\d+)\//)?.[1] || "0");
    const box = url.pathname.match(/-(\d{2,4})x(\d{2,4})\.[a-z0-9]+$/i);
    return Math.max(query, bbc, box ? Number(box[1]) : 0);
  } catch {
    return 0;
  }
}

const CARD_BBC = 480;

/** One modest image for a shelf card. The post window asks for the large file separately. */
export function cardPicture(input: string | null | undefined): string | null {
  const image = httpsImage(input);
  if (!image) return null;
  const youtube = image.match(YOUTUBE_STILL);
  if (youtube) return `https://i.ytimg.com/vi/${youtube[1]}/hqdefault.jpg`;
  try {
    const url = new URL(image);
    const host = url.hostname.toLowerCase();
    if (host === "ichef.bbci.co.uk" || host.endsWith(".bbci.co.uk")) {
      url.pathname = url.pathname.replace(/(\/ace\/(?:standard|branded_news|ws)\/)(\d+)(?=\/)/, (full, prefix, size) => {
        const width = Number(size);
        return width >= 320 && width <= 640 ? full : `${prefix}${CARD_BBC}`;
      });
      return url.toString();
    }
  } catch {
    return image;
  }
  return image;
}

/** Larger official image first, then the original if that request fails. */
export function pictureSources(input: string | null | undefined): string[] {
  const image = httpsImage(input);
  if (!image) return [];
  const youtube = image.match(YOUTUBE_STILL);
  if (youtube) {
    const id = youtube[1];
    return unique([
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/hq720.jpg`,
      `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      image,
    ]);
  }
  const sharp = enlargeKnownImage(image);
  return unique(sharp === image ? [image] : [sharp, image]);
}

function sharpestSibling(urls: string[]): string {
  const first = urls[0];
  const key = imageIdentity(first);
  let best = first;
  let bestWidth = declaredWidth(first);
  for (const url of urls) {
    if (imageIdentity(url) !== key) continue;
    const width = declaredWidth(url);
    if (width > bestWidth) {
      best = url;
      bestWidth = width;
    }
  }
  return best;
}

function imageIdentity(image: string): string {
  try {
    const url = new URL(image);
    for (const key of ["width", "w", "height", "h", "quality", "s", "sig", "auto", "fit"]) url.searchParams.delete(key);
    url.pathname = url.pathname.replace(/(\/ace\/(?:standard|branded_news|ws)\/)\d+(?=\/)/, "$1");
    return `${url.origin}${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return image;
  }
}

function enlargeKnownImage(image: string): string {
  let url: URL;
  try {
    url = new URL(image);
  } catch {
    return image;
  }
  const host = url.hostname.toLowerCase();
  if (host === "preview.redd.it") {
    const file = url.pathname.split("/").filter(Boolean).pop() || "";
    if (/\.(?:jpe?g|png|webp|gif)$/i.test(file)) return `https://i.redd.it/${file}`;
  }
  if (host === "ichef.bbci.co.uk" || host.endsWith(".bbci.co.uk")) {
    url.pathname = url.pathname.replace(/(\/ace\/(?:standard|branded_news|ws)\/)(\d+)(?=\/)/, (full, prefix, size) =>
      Number(size) >= 1536 ? full : `${prefix}1536`,
    );
    return url.toString();
  }
  if (host.endsWith("vimeocdn.com")) {
    url.pathname = url.pathname.replace(/_(\d+)x(\d+)(?=\.)/, (full, width) => (Number(width) < 1280 ? "_1280x720" : full));
    return url.toString();
  }
  const enlarged = url.pathname.replace(/-(\d{2,4})x(\d{2,4})(?=\.(?:jpe?g|png|webp)$)/i, (full, width, height) => {
    const w = Number(width);
    const h = Number(height);
    return w >= 80 && w <= 900 && h >= 80 && h <= 900 ? "" : full;
  });
  if (enlarged !== url.pathname) {
    url.pathname = enlarged;
    return url.toString();
  }
  return image;
}

function unique(urls: string[]): string[] {
  return [...new Set(urls)];
}
