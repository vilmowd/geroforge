const EMBED_RULES: { host: string; test: (pathname: string) => boolean }[] = [
  {
    host: "www.youtube-nocookie.com",
    test: (pathname) => /^\/embed\/[\w-]{11}\/?$/.test(pathname),
  },
  {
    host: "www.youtube.com",
    test: (pathname) => /^\/embed\/[\w-]{11}\/?$/.test(pathname),
  },
  {
    host: "www.tiktok.com",
    test: (pathname) => /^\/embed\/v2\/\d{6,24}\/?$/.test(pathname),
  },
  {
    host: "www.instagram.com",
    test: (pathname) => /^\/(?:reel|p|tv)\/[A-Za-z0-9_-]{5,30}\/embed\/?$/.test(pathname),
  },
  {
    host: "player.vimeo.com",
    test: (pathname) => /^\/video\/\d{5,12}\/?$/.test(pathname),
  },
  {
    host: "www.redditmedia.com",
    test: (pathname) => /^\/r\/[A-Za-z0-9_]+\/comments\/[a-z0-9]+\/[A-Za-z0-9_-]+\/?$/.test(pathname),
  },
];

const ALLOWED_QUERY = new Set([
  "embed",
  "theme",
  "autoplay",
  "mute",
  "muted",
  "playsinline",
  "rel",
  "modestbranding",
  "controls",
  "loop",
  "playlist",
  "fs",
  "enablejsapi",
]);

export function isAllowedEmbedUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_QUERY.has(key)) return false;
  }
  const rule = EMBED_RULES.find((item) => item.host === url.hostname);
  return Boolean(rule?.test(url.pathname));
}

export function canonicalVideoPage(embedUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(embedUrl);
  } catch {
    return null;
  }
  if (url.hostname === "www.youtube-nocookie.com") {
    const id = url.pathname.match(/\/embed\/([\w-]{11})/)?.[1];
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
  }
  if (url.hostname === "www.tiktok.com") {
    const id = url.pathname.match(/\/embed\/v2\/(\d{6,24})/)?.[1];
    return id ? `https://www.tiktok.com/video/${id}` : null;
  }
  if (url.hostname === "www.instagram.com") {
    const match = url.pathname.match(/\/(reel|p|tv)\/([A-Za-z0-9_-]{5,30})\/embed\/?$/);
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}` : null;
  }
  if (url.hostname === "player.vimeo.com") {
    const id = url.pathname.match(/\/video\/(\d{5,12})/)?.[1];
    return id ? `https://vimeo.com/${id}` : null;
  }
  return null;
}

export function toEmbedUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const youtube = youtubeId(url);
  if (youtube) return allow(`https://www.youtube-nocookie.com/embed/${youtube}`);

  const tiktok = tiktokId(url);
  if (tiktok) return allow(`https://www.tiktok.com/embed/v2/${tiktok}`);

  const instagram = instagramEmbed(url);
  if (instagram) return allow(instagram);

  const vimeo = vimeoEmbed(url);
  if (vimeo) return allow(vimeo);

  return null;
}

export function redditVideoEmbed(permalink: string): string | null {
  let pathname = permalink;
  try {
    if (permalink.startsWith("http")) pathname = new URL(permalink).pathname;
  } catch {
    return null;
  }
  const withSlash = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return allow(`https://www.redditmedia.com${withSlash}?embed=true&theme=dark`);
}

export function isVideoHost(input: string): boolean {
  try {
    const host = new URL(input).hostname.toLowerCase();
    return (
      host.endsWith("tiktok.com") ||
      host.endsWith("instagram.com") ||
      host === "youtu.be" ||
      host.endsWith("youtube.com") ||
      host.endsWith("youtube-nocookie.com") ||
      host.endsWith("vimeo.com") ||
      host === "v.redd.it"
    );
  } catch {
    return false;
  }
}

export function isDirectMedia(input: string): boolean {
  return /\.(mp4|webm|m3u8|mov)(\?|$)/i.test(input) || input.includes("v.redd.it");
}

function allow(value: string): string | null {
  return isAllowedEmbedUrl(value) ? value : null;
}

export function youtubeVideoId(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    return youtubeId(new URL(input));
  } catch {
    return null;
  }
}

export function playbackEmbedSrc(input: string | null | undefined): string | null {
  const id = youtubeVideoId(input);
  if (id) {
    const url = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    url.searchParams.set("autoplay", "1");
    // Phones refuse to start a clip that opens with sound, and then show their own play button.
    // Start silent. Sound comes on only after the visitor taps the sound button.
    url.searchParams.set("mute", "1");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("rel", "0");
    url.searchParams.set("modestbranding", "1");
    url.searchParams.set("controls", "1");
    url.searchParams.set("fs", "0");
    url.searchParams.set("loop", "1");
    url.searchParams.set("playlist", id);
    url.searchParams.set("enablejsapi", "1");
    return allow(url.toString());
  }
  if (!input || !isAllowedEmbedUrl(input)) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.hostname === "player.vimeo.com") {
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("muted", "1");
    url.searchParams.set("playsinline", "1");
  } else if (url.hostname === "www.tiktok.com") {
    url.searchParams.set("autoplay", "1");
  }
  return isAllowedEmbedUrl(url.toString()) ? url.toString() : null;
}

export function shortsEmbedSrc(input: string | null | undefined, muted: boolean): string | null {
  const id = youtubeVideoId(input);
  if (!id) return null;
  const url = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("mute", muted ? "1" : "0");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("controls", "1");
  url.searchParams.set("fs", "0");
  url.searchParams.set("loop", "1");
  url.searchParams.set("playlist", id);
  url.searchParams.set("enablejsapi", "1");
  return allow(url.toString());
}

export function youtubePoster(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const id = youtubeId(new URL(input));
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

function youtubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] || "";
    return /^[\w-]{11}$/.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    const fromQuery = url.searchParams.get("v");
    if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery;
    const parts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live"].includes(parts[0] || "") && parts[1] && /^[\w-]{11}$/.test(parts[1])) {
      return parts[1];
    }
  }
  return null;
}

function tiktokId(url: URL): string | null {
  if (!url.hostname.toLowerCase().endsWith("tiktok.com")) return null;
  const match = url.pathname.match(/\/(?:video|embed\/v2)\/(\d{6,24})/);
  return match?.[1] ?? null;
}

function instagramEmbed(url: URL): string | null {
  if (!url.hostname.toLowerCase().endsWith("instagram.com")) return null;
  const match = url.pathname.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,30})/);
  if (!match) return null;
  const kind = url.pathname.includes("/p/") ? "p" : url.pathname.includes("/tv/") ? "tv" : "reel";
  return `https://www.instagram.com/${kind}/${match[1]}/embed`;
}

function vimeoEmbed(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === "player.vimeo.com") {
    const id = url.pathname.match(/\/video\/(\d{5,12})/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (!host.endsWith("vimeo.com")) return null;
  const id = url.pathname.match(/\/(\d{5,12})(?:\/|$)/)?.[1];
  return id ? `https://player.vimeo.com/video/${id}` : null;
}
