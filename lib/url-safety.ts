import { IngestError } from "@/lib/errors";

export const USER_AGENT = "GeroForge/1.0 (public feed reader)";

const TRACKING_KEYS = new Set(["ref", "ref_src", "feature", "fbclid", "gclid", "igshid"]);

export async function assertPublicHttpUrl(input: string, options?: { keepSlash?: boolean }): Promise<URL> {
  if (!input || input.length > 2000) {
    throw new IngestError("Enter an http(s) link.");
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new IngestError("Enter an http(s) link.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new IngestError("Enter an http(s) link.");
  }
  if (url.username || url.password) {
    throw new IngestError("Links with embedded credentials are not accepted.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new IngestError("Only public web ports are allowed.");
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (isBlockedHostname(host)) {
    throw new IngestError("That address can't be fetched.");
  }

  if (looksLikeIp(host)) {
    if (isBlockedIp(host)) throw new IngestError("That address can't be fetched.");
  } else {
    let records: { address: string }[];
    try {
      records = await lookupAll(host);
    } catch {
      throw new IngestError("Could not resolve that host.");
    }
    if (records.length === 0 || records.some((record) => isBlockedIp(record.address))) {
      throw new IngestError("That address can't be fetched.");
    }
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith("utm_") || TRACKING_KEYS.has(lower)) url.searchParams.delete(key);
  }
  if (!options?.keepSlash && url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url;
}

export async function resolvePublicUrl(rawUrl: string): Promise<string> {
  let current = await assertPublicHttpUrl(rawUrl);
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      signal: AbortSignal.timeout(10000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location) break;
      current = await assertPublicHttpUrl(new URL(location, current).toString(), { keepSlash: true });
      continue;
    }
    await response.body?.cancel().catch(() => undefined);
    return current.toString();
  }
  return current.toString();
}

export async function fetchPublicBody(
  rawUrl: string,
  mode: "article" | "feed",
): Promise<{ finalUrl: string; body: string }> {
  let current = await assertPublicHttpUrl(rawUrl, { keepSlash: true });

  for (let hop = 0; hop < 5; hop += 1) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          mode === "feed"
            ? "application/json, application/rss+xml, application/atom+xml, text/xml, text/plain;q=0.8"
            : "text/html, application/xhtml+xml, text/plain;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location) throw new IngestError("The source redirected without a destination.");
      current = await assertPublicHttpUrl(new URL(location, current).toString(), { keepSlash: true });
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new IngestError(`The source returned HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") || "";
    const allowed =
      mode === "feed"
        ? /json|xml|text\/plain|text\/html/i.test(contentType) || contentType === ""
        : /text\/html|text\/plain|application\/xhtml|xml/i.test(contentType) || contentType === "";
    if (!allowed) {
      await response.body?.cancel().catch(() => undefined);
      throw new IngestError("That link is not a readable page.");
    }

    const length = Number(response.headers.get("content-length") || 0);
    if (length > 2_000_000) {
      await response.body?.cancel().catch(() => undefined);
      throw new IngestError("That page is too large to process.");
    }

    const body = await readLimitedText(response, mode === "feed" ? 1_500_000 : 800_000);
    return { finalUrl: current.toString(), body };
  }

  throw new IngestError("Too many redirects.");
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
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
      if (value.byteLength > room) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

async function lookupAll(host: string): Promise<{ address: string }[]> {
  // The app bundler cannot see a static `dns` import from the instrumentation graph.
  const load = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<typeof import("node:dns")>;
  const loaded = (await load("node:" + "dns")) as typeof import("node:dns") & {
    default?: typeof import("node:dns");
  };
  const promises = loaded.promises ?? loaded.default?.promises;
  if (!promises) throw new IngestError("Could not resolve that host.");
  return promises.lookup(host, { all: true });
}

function isBlockedHostname(host: string): boolean {
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }
  if (!host.includes(".") && !looksLikeIp(host)) return true;
  if (/^[\d.]+$/.test(host) && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (looksLikeIp(host)) return isBlockedIp(host);
  return false;
}

function looksLikeIp(host: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":");
}

function isBlockedIp(host: string): boolean {
  const bare = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (bare === "::" || bare === "::1" || bare === "0:0:0:0:0:0:0:1") return true;
  const mapped = bare.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const ip = mapped ? mapped[1] : bare;
  if (ip.includes(":")) {
    return ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");
  }
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((part) => Number(part));
  if (nums.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = nums;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}
