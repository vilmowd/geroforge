import { canonicalVideoPage } from "@/lib/embed";
import { decodeEntities } from "@/lib/text";
import { USER_AGENT, assertPublicHttpUrl } from "@/lib/url-safety";

export type SiteMarkFile = {
  bytes: Buffer;
  type: string;
  width: number;
};

type Downloaded = {
  finalUrl: string;
  bytes: Buffer;
  type: string;
};

type IconChoice = {
  href: string;
  score: number;
};

const cache = new Map<string, { at: number; mark: SiteMarkFile | null }>();
const flights = new Map<string, Promise<SiteMarkFile | null>>();
const HIT_MS = 24 * 60 * 60 * 1000;
const MISS_MS = 15 * 60 * 1000;
const CACHE_MAX = 180;

export function siteHost(sourceUrl: string | null, embedUrl: string | null): string | null {
  const page = httpPage(sourceUrl) || (embedUrl ? canonicalVideoPage(embedUrl) : null);
  if (!page) return null;
  try {
    const host = new URL(page).hostname.toLowerCase().replace(/\.$/, "");
    return publicHost(host) ? host : null;
  } catch {
    return null;
  }
}

export function iconChoices(markup: string, pageUrl: string): IconChoice[] {
  const tags = markup.match(/<link\b[^>]*>/gi) || [];
  const found: IconChoice[] = [];
  for (const tag of tags.slice(0, 40)) {
    const rel = attr(tag, "rel").toLowerCase();
    if (!rel || rel.includes("mask-icon") || rel === "manifest") continue;
    if (!/(^|\s)(apple-touch-icon(-precomposed)?|shortcut icon|icon)(\s|$)/.test(rel)) continue;
    const href = absoluteIcon(attr(tag, "href"), pageUrl);
    if (!href) continue;
    const type = attr(tag, "type").toLowerCase();
    const declared = declaredSize(attr(tag, "sizes"));
    let score = declared ? declared * 10 : rel.includes("apple-touch-icon") ? 1800 : 320;
    if (type.includes("svg") || /\.svg(\?|$)/i.test(href)) score = Math.max(score, 2500);
    found.push({ href, score });
  }
  return dedupe(found);
}

export function manifestHref(markup: string, pageUrl: string): string | null {
  const tags = markup.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags.slice(0, 40)) {
    if (attr(tag, "rel").toLowerCase() !== "manifest") continue;
    return absoluteIcon(attr(tag, "href"), pageUrl);
  }
  return null;
}

export function manifestIcons(body: string, pageUrl: string): IconChoice[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  const icons =
    parsed && typeof parsed === "object" && Array.isArray((parsed as { icons?: unknown }).icons)
      ? (parsed as { icons: { src?: unknown; sizes?: unknown; type?: unknown; purpose?: unknown }[] }).icons
      : [];
  const found: IconChoice[] = [];
  for (const icon of icons.slice(0, 12)) {
    if (!icon || typeof icon.src !== "string") continue;
    const href = absoluteIcon(icon.src, pageUrl);
    if (!href) continue;
    const purpose = typeof icon.purpose === "string" ? icon.purpose.toLowerCase() : "";
    if (purpose === "monochrome") continue;
    const type = typeof icon.type === "string" ? icon.type.toLowerCase() : "";
    const declared = declaredSize(typeof icon.sizes === "string" ? icon.sizes : "");
    let score = declared ? declared * 10 : 640;
    if (type.includes("svg") || /\.svg(\?|$)/i.test(href)) score = Math.max(score, 2500);
    if (purpose.includes("maskable") && !purpose.includes("any")) score -= 200;
    found.push({ href, score });
  }
  return dedupe(found);
}

export function normalizeMark(bytes: Buffer, type: string): SiteMarkFile | null {
  const kind = type.toLowerCase();
  if (kind.includes("svg") || looksLikeSvg(bytes)) {
    const svg = presentSvg(bytes);
    return svg ? { bytes: svg, type: "image/svg+xml", width: 512 } : null;
  }
  const extracted = largestIcoPng(bytes);
  const png = pngSize(extracted || bytes);
  if (png) {
    const width = usable(png.w, png.h);
    return width ? { bytes: extracted || bytes, type: "image/png", width } : null;
  }
  const jpeg = jpegSize(bytes);
  if (jpeg) {
    const width = usable(jpeg.w, jpeg.h);
    return width ? { bytes, type: "image/jpeg", width } : null;
  }
  const webp = webpSize(bytes);
  if (webp) {
    const width = usable(webp.w, webp.h);
    return width ? { bytes, type: "image/webp", width } : null;
  }
  const gif = gifSize(bytes);
  if (gif) {
    const width = usable(gif.w, gif.h);
    return width ? { bytes, type: "image/gif", width } : null;
  }
  return null;
}

export async function loadSiteMark(host: string): Promise<SiteMarkFile | null> {
  const key = host.toLowerCase();
  if (!publicHost(key)) return null;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (hit.mark ? HIT_MS : MISS_MS)) return hit.mark;
  const pending = flights.get(key);
  if (pending) return pending;
  const job = resolveSiteMark(key)
    .then((mark) => {
      remember(key, mark);
      return mark;
    })
    .catch(() => {
      remember(key, null);
      return null;
    })
    .finally(() => {
      flights.delete(key);
    });
  flights.set(key, job);
  return job;
}

async function resolveSiteMark(host: string): Promise<SiteMarkFile | null> {
  const origin = await assertPublicHttpUrl(`https://${host}/`);
  const page = await fetchPublic(origin.toString(), 180_000, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.2", true);
  const pageUrl = page?.finalUrl || origin.toString();
  const choices = page ? iconChoices(page.bytes.toString("utf8"), pageUrl) : [];
  const declared = choices.reduce((max, item) => Math.max(max, item.score), 0);
  if (page && declared < 1920) {
    const manifest = manifestHref(page.bytes.toString("utf8"), pageUrl);
    if (manifest) {
      const file = await fetchPublic(manifest, 100_000, "application/manifest+json,application/json,text/plain;q=0.5", true);
      if (file) choices.push(...manifestIcons(file.bytes.toString("utf8"), file.finalUrl));
    }
  }
  choices.sort((left, right) => right.score - left.score);
  const urls = [...new Set(choices.map((item) => item.href))].slice(0, 4);
  urls.push(new URL("/apple-touch-icon.png", origin).toString());
  let best = await sharpest([...new Set(urls)]);
  if (!best || best.width < 96) {
    const google = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(origin.toString())}&size=256`;
    const extra = await sharpest([google]);
    if (extra && (!best || extra.width > best.width)) best = extra;
  }
  return best && best.width >= 48 ? best : null;
}

async function sharpest(urls: string[]): Promise<SiteMarkFile | null> {
  const files = await Promise.all(urls.slice(0, 5).map((url) => fetchPublic(url, 350_000, "image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,*/*;q=0.4", false)));
  let best: SiteMarkFile | null = null;
  for (const file of files) {
    if (!file) continue;
    const mark = normalizeMark(file.bytes, file.type);
    if (mark && (!best || mark.width > best.width)) best = mark;
  }
  return best;
}

async function fetchPublic(rawUrl: string, maxBytes: number, accept: string, allowTruncate: boolean): Promise<Downloaded | null> {
  try {
    let current = await assertPublicHttpUrl(rawUrl, { keepSlash: true });
    for (let hop = 0; hop < 4; hop += 1) {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT, Accept: accept },
        signal: AbortSignal.timeout(8000),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);
        if (!location) return null;
        current = await assertPublicHttpUrl(new URL(location, current).toString(), { keepSlash: true });
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return null;
      }
      const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      const bytes = await readLimited(response, maxBytes, allowTruncate);
      if (!bytes) return null;
      return { finalUrl: current.toString(), bytes, type };
    }
  } catch {
    return null;
  }
  return null;
}

async function readLimited(response: Response, maxBytes: number, allowTruncate: boolean): Promise<Buffer | null> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes && !allowTruncate) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }
  const reader = response.body?.getReader();
  if (!reader) return null;
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const room = maxBytes - total;
      const slice = value.byteLength > room ? value.subarray(0, room) : value;
      parts.push(slice);
      total += slice.byteLength;
      if (value.byteLength > room) {
        if (!allowTruncate) return null;
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return Buffer.concat(parts, total);
}

function remember(host: string, mark: SiteMarkFile | null) {
  cache.set(host, { at: Date.now(), mark });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

function publicHost(host: string): boolean {
  if (!/^[a-z0-9.-]{1,253}$/.test(host) || !host.includes(".") || host.startsWith(".") || host.endsWith(".")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  return true;
}

function httpPage(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function absoluteIcon(href: string, pageUrl: string): string | null {
  const cleaned = decodeEntities(href).trim();
  if (!cleaned || cleaned.startsWith("data:") || cleaned.startsWith("javascript:")) return null;
  try {
    const url = new URL(cleaned, pageUrl);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"));
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? "";
}

function declaredSize(value: string): number {
  const sizes = [...value.matchAll(/(\d+)\s*x\s*(\d+)/gi)].map((match) => Math.min(Number(match[1]), Number(match[2])));
  return sizes.length ? Math.max(...sizes) : 0;
}

function dedupe(choices: IconChoice[]): IconChoice[] {
  const byHref = new Map<string, IconChoice>();
  for (const choice of choices) {
    const current = byHref.get(choice.href);
    if (!current || choice.score > current.score) byHref.set(choice.href, choice);
  }
  return [...byHref.values()].sort((left, right) => right.score - left.score);
}

function usable(width: number, height: number): number | null {
  if (width < 48 || height < 48) return null;
  if (Math.max(width, height) / Math.min(width, height) > 2.2) return null;
  return Math.min(width, height);
}

function looksLikeSvg(bytes: Buffer): boolean {
  const head = bytes.subarray(0, 180).toString("utf8").trim().toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}

function presentSvg(bytes: Buffer): Buffer | null {
  if (!safeSvg(bytes)) return null;
  const text = bytes.toString("utf8").replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
    const width = numericAttr(attrs, "width");
    const height = numericAttr(attrs, "height");
    let next = attrs.replace(/\s(?:width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    if (!/\bviewBox\s*=/i.test(next) && width && height) next += ` viewBox="0 0 ${width} ${height}"`;
    return `<svg width="512" height="512"${next}>`;
  });
  const out = Buffer.from(text);
  return safeSvg(out) ? out : null;
}

function numericAttr(attrs: string, name: string): number | null {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  const raw = (match?.[2] ?? match?.[3] ?? match?.[4] ?? "").trim();
  const value = Number(raw.replace(/px$/i, ""));
  return Number.isFinite(value) && value > 0 && value <= 4096 ? value : null;
}

function safeSvg(bytes: Buffer): boolean {
  if (bytes.length < 20 || bytes.length > 80_000) return false;
  const text = bytes.toString("utf8");
  if (!/<svg[\s>]/i.test(text)) return false;
  return !/<script|<\/script|javascript:|<foreignobject|<iframe|<embed|\son[a-z]+\s*=/i.test(text);
}

function pngSize(bytes: Buffer): { w: number; h: number } | null {
  if (bytes.length < 24) return null;
  if (bytes[0] !== 0x89 || bytes.toString("ascii", 1, 4) !== "PNG") return null;
  if (bytes.toString("ascii", 12, 16) !== "IHDR") return null;
  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

function largestIcoPng(bytes: Buffer): Buffer | null {
  if (bytes.length < 22 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1) return null;
  const count = bytes.readUInt16LE(4);
  let best: Buffer | null = null;
  let bestWidth = 0;
  for (let index = 0; index < count && 6 + (index + 1) * 16 <= bytes.length; index += 1) {
    const entry = 6 + index * 16;
    const width = bytes[entry] || 256;
    const size = bytes.readUInt32LE(entry + 8);
    const offset = bytes.readUInt32LE(entry + 12);
    if (size < 8 || offset < 0 || offset + size > bytes.length) continue;
    const slice = bytes.subarray(offset, offset + size);
    if (slice[0] !== 0x89 || slice.toString("ascii", 1, 4) !== "PNG") continue;
    if (width > bestWidth) {
      best = Buffer.from(slice);
      bestWidth = width;
    }
  }
  return best;
}

function jpegSize(bytes: Buffer): { w: number; h: number } | null {
  if (bytes.length < 10 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: bytes.readUInt16BE(offset + 5), w: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function gifSize(bytes: Buffer): { w: number; h: number } | null {
  if (bytes.length < 10 || bytes.toString("ascii", 0, 3) !== "GIF") return null;
  return { w: bytes.readUInt16LE(6), h: bytes.readUInt16LE(8) };
}

function webpSize(bytes: Buffer): { w: number; h: number } | null {
  if (bytes.length < 30 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X" && bytes.length >= 30) {
    return {
      w: 1 + bytes.readUIntLE(24, 3),
      h: 1 + bytes.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    const start = bytes.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
    if (start < 0 || start + 7 > bytes.length) return null;
    return { w: bytes.readUInt16LE(start + 3) & 0x3fff, h: bytes.readUInt16LE(start + 5) & 0x3fff };
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const bits = bytes.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}
