import { listingScore, redditClip, shelfFormat } from "../lib/clips";
import { cleanLine, pairDoors, preferSources, type DoorPeek } from "../lib/digest";
import { leadParagraphs, visibleLead } from "../lib/html";
import { remixText } from "../lib/remixer";
import { isAllowedEmbedUrl, playbackEmbedSrc, redditVideoEmbed, toEmbedUrl } from "../lib/embed";
import { SOURCES } from "../lib/sources";
import { iconChoices, manifestIcons, normalizeMark, siteHost } from "../lib/site-mark";
import { cardPicture, imageFromMarkup, openGraphImage, pictureSources } from "../lib/thumbnails";
import { REELS_PER_RUN, VIDEOS_PER_RUN, spreadSources } from "../lib/pipeline";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const cloud = remixText({
  title: "Cloud bills",
  text: "Public cloud spend reached $270 billion last year, up 18% as teams folded 3x more workloads onto fewer vendors. Finance asked for one bill. Engineering asked for fewer consoles.",
  categoryHint: "Technology",
});

assert(cloud.category === "Technology", `category ${cloud.category}`);
assert(cloud.remix.tldr.includes("$270 billion"), cloud.remix.tldr);
assert(cloud.remix.stats.some((stat) => stat.value.includes("$270")), JSON.stringify(cloud.remix.stats));
assert(cloud.remix.stats.some((stat) => stat.value.includes("%")), JSON.stringify(cloud.remix.stats));
assert(cloud.remix.stats.some((stat) => /3\s?x/i.test(stat.value)), JSON.stringify(cloud.remix.stats));
assert(!cloud.remix.markdown.includes("Public cloud spend reached"), cloud.remix.markdown);
assert(cloud.remix.format === "article", cloud.remix.format || "missing format");

const ai = remixText({
  title: "Eval notes",
  text: "The language model eval moved 42% after a rewrite. Training still cost $1.4 million.",
  categoryHint: "Technology",
});
assert(ai.category === "AI", ai.category);

const youtube = toEmbedUrl("https://www.youtube.com/shorts/aqz-KE-bpKQ?utm_source=share");
assert(youtube === "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ", youtube || "missing youtube embed");
assert(isAllowedEmbedUrl(youtube || ""), "youtube embed rejected");
const playing = playbackEmbedSrc(youtube);
const playback = playing ? new URL(playing) : null;
assert(playback?.hostname === "www.youtube-nocookie.com", playing || "missing playback embed");
assert(playback?.searchParams.get("autoplay") === "1", "playback autoplay");
assert(playback?.searchParams.get("mute") === "1", "phone playback must start muted");
assert(playback?.searchParams.get("playsinline") === "1", "playback playsinline");
assert(playback?.searchParams.get("loop") === null, "playback should not pin the first clip");

const shortsFeed = SOURCES.find((source) => source.sourceName === "YouTube Shorts / Zach King");
assert(shortsFeed?.format === "reel", shortsFeed?.format || "missing shorts feed");
assert(shortsFeed?.url.includes("playlist_id=UUSHq8DICunczvLuJJq414110A") === true, shortsFeed?.url || "missing shorts url");
const longFeed = SOURCES.find((source) => source.sourceName === "YouTube / Veritasium");
assert(longFeed?.url.includes("playlist_id=UULFHnyfMqiRRG1u-2MsSQLbXA") === true, longFeed?.url || "missing long video feed");
assert(longFeed?.format === "video", longFeed?.format || "missing long format");
assert(SOURCES.filter((source) => source.format === "reel").length >= 24, "reel sources");
assert(SOURCES.some((source) => source.sourceName === "YouTube Shorts / NBA"), "sports reel source");
assert(SOURCES.some((source) => source.sourceName === "YouTube / NASA"), "long video source");
assert(SOURCES.some((source) => source.sourceName === "Reddit /r/ArtisanVideos"), "maker reel source");
assert(SOURCES.some((source) => source.sourceName === "Reddit / popular clips" && source.url.includes("/r/TikTok+")), "popular clips across communities");
assert(SOURCES.some((source) => source.sourceName === "Reddit / popular videos" && source.format === "video"), "popular videos across communities");
assert(REELS_PER_RUN >= 6 && VIDEOS_PER_RUN >= 4, "clip budgets");
assert(
  SOURCES.filter((source) => source.kind === "youtube" && source.format === "video").every((source) => source.url.includes("playlist_id=UULF")),
  "video channels use the long uploads feed",
);
assert(
  SOURCES.filter((source) => source.kind === "youtube" && source.format === "reel").every((source) => source.url.includes("playlist_id=UUSH")),
  "reel channels use the shorts feed",
);

const tiktokPost = redditClip(
  {
    title: "A short clip",
    permalink: "/r/TikTok/comments/abc123/a_short_clip/",
    url: "https://www.tiktok.com/@reader/video/1234567890123456789",
  },
  "reel",
);
assert(tiktokPost?.format === "reel", tiktokPost?.format || "missing tiktok clip");
assert(tiktokPost?.embedUrl === "https://www.tiktok.com/embed/v2/1234567890123456789", tiktokPost?.embedUrl || "missing tiktok embed");

const nativePost = redditClip(
  {
    title: "Loop",
    permalink: "/r/BetterEveryLoop/comments/abc123/loop/",
    is_video: true,
    domain: "v.redd.it",
  },
  "reel",
);
assert(nativePost?.embedUrl === redditVideoEmbed("https://www.reddit.com/r/BetterEveryLoop/comments/abc123/loop/"), nativePost?.embedUrl || "missing reddit player");
assert(nativePost?.format === "reel", nativePost?.format || "native clip format");
assert(listingScore({ score: 2400, ups: 12 }) === 2400, "viral score");
assert(listingScore({ ups: 80 }) === 80, "viral ups");

const picturePost = redditClip(
  {
    title: "Photo",
    permalink: "/r/oddlysatisfying/comments/abc123/photo/",
    url: "https://i.redd.it/example.jpg",
  },
  "reel",
);
assert(picturePost === null, "pictures are not reels");
assert(shelfFormat("video", "https://www.youtube.com/watch?v=aqz-KE-bpKQ", false, true) === "video", "long videos stay videos");
assert(shelfFormat("video", "https://www.youtube.com/shorts/aqz-KE-bpKQ", true, true) === "reel", "shorts move to reels");
assert(shelfFormat("reel", "https://www.youtube.com/shorts/aqz-KE-bpKQ", true, true) === "reel", "shorts on the reel shelf stay reels");
const longReddit = redditClip(
  {
    title: "A long upload",
    permalink: "/r/videos/comments/abc123/a_long_upload/",
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  "video",
);
assert(longReddit?.format === "video", longReddit?.format || "long YouTube uploads belong on videos");

const tiktok = toEmbedUrl("https://www.tiktok.com/@reader/video/1234567890123456789");
assert(tiktok === "https://www.tiktok.com/embed/v2/1234567890123456789", tiktok || "missing tiktok embed");

const instagram = toEmbedUrl("https://www.instagram.com/reel/AbC123/?utm_source=ig");
assert(instagram === "https://www.instagram.com/reel/AbC123/embed", instagram || "missing instagram embed");

const vimeo = toEmbedUrl("https://vimeo.com/123456789");
assert(vimeo === "https://player.vimeo.com/video/123456789", vimeo || "missing vimeo embed");

assert(toEmbedUrl("https://example.com/watch?v=aqz-KE-bpKQ") === null, "unrelated hosts must not embed");
assert(isAllowedEmbedUrl("javascript:alert(1)") === false, "javascript embed must fail");

const guardian = imageFromMarkup(`
  <media:content url="https://i.guim.co.uk/img/media/abc/master/1333.jpg?width=140&amp;quality=85&amp;s=aaa" />
  <media:content url="https://i.guim.co.uk/img/media/abc/master/1333.jpg?width=700&amp;quality=85&amp;s=bbb" />
`);
assert(guardian?.includes("width=700") === true, guardian || "missing guardian image");
const pageImage = openGraphImage(
  `<meta property="og:image" content="https://i.guim.co.uk/img/media/abc/master/1333.jpg?width=1200&amp;quality=85&amp;s=ccc" />`,
);
assert(pageImage?.includes("width=1200") === true, pageImage || "missing page image");

const youtubeCard = cardPicture("https://i2.ytimg.com/vi/aqz-KE-bpKQ/maxresdefault.jpg");
assert(youtubeCard === "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg", youtubeCard || "missing card still");
const wordpressCard = cardPicture("https://cdn.arstechnica.net/wp-content/uploads/2026/10/news-100326a-lg-500x500.jpg");
assert(wordpressCard?.includes("-500x500") === true, wordpressCard || "card should keep the small file");

const spread = spreadSources(["a", "b", "c", "d", "e", "f", "g", "h"], 4);
assert(spread.length === 4, `spread ${spread.join(",")}`);
assert(new Set(spread).size === 4, "spread must pick different sources");

const youtubeStill = pictureSources("https://i2.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg");
assert(youtubeStill[0] === "https://i.ytimg.com/vi/aqz-KE-bpKQ/maxresdefault.jpg", youtubeStill[0] || "missing still");
assert(youtubeStill.includes("https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg"), "youtube fallback missing");

const bbc = pictureSources("https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/abc.jpg");
assert(bbc[0]?.includes("/ace/standard/1536/") === true, bbc[0] || "missing bbc");
assert(bbc[1]?.includes("/240/") === true, "bbc fallback missing");

const reddit = pictureSources("https://preview.redd.it/82vo3vizinth1.jpeg?width=640&crop=smart&auto=webp&s=abc");
assert(reddit[0] === "https://i.redd.it/82vo3vizinth1.jpeg", reddit[0] || "missing reddit image");
assert(reddit[1]?.includes("preview.redd.it") === true, "reddit fallback missing");

const wordpress = pictureSources("https://cdn.arstechnica.net/wp-content/uploads/2026/10/news-100326a-lg-500x500.jpg");
assert(wordpress[0]?.endsWith("/news-100326a-lg.jpg") === true, wordpress[0] || "missing wordpress image");
assert(wordpress[1]?.includes("-500x500") === true, "wordpress fallback missing");

assert(siteHost("https://www.theguardian.com/world/story", null) === "www.theguardian.com", "guardian host");
assert(siteHost(null, "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ") === "www.youtube.com", "youtube host");
assert(siteHost("javascript:alert(1)", null) === null, "script host");
assert(siteHost("http://127.0.0.1/secret", null) === null, "loopback host");
assert(siteHost("http://localhost/admin", null) === null, "localhost host");

const icons = iconChoices(
  `<link rel="mask-icon" href="https://cdn.example/mask.svg">
   <link rel="icon" href="javascript:alert(1)">
   <link rel="icon" sizes="32x32" href="/favicon-32.png">
   <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
   <link rel="icon" type="image/svg+xml" href="/icon.svg">`,
  "https://www.example.com/news",
);
assert(icons[0]?.href === "https://www.example.com/icon.svg", icons[0]?.href || "missing svg icon");
assert(icons.some((icon) => icon.href.endsWith("/apple-touch-icon.png")), "apple icon missing");
assert(!icons.some((icon) => icon.href.includes("mask") || icon.href.startsWith("javascript:")), "unsafe icon kept");

const manifest = manifestIcons(
  JSON.stringify({ icons: [{ src: "/icons/512.png", sizes: "512x512" }, { src: "/icons/32.png", sizes: "32x32" }] }),
  "https://www.example.com/manifest.webmanifest",
);
assert(manifest[0]?.href === "https://www.example.com/icons/512.png", manifest[0]?.href || "missing manifest icon");
assert(manifest.some((icon) => icon.href === "https://www.example.com/512.png"), "manifest icon beside the manifest");

const png = Buffer.alloc(24);
png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
png.writeUInt32BE(180, 16);
png.writeUInt32BE(180, 20);
assert(normalizeMark(png, "image/png")?.width === 180, "png size");
assert(normalizeMark(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "image/svg+xml") === null, "script svg");
const plainSvg = normalizeMark(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"></svg>'), "image/svg+xml");
assert(plainSvg?.width === 512, "plain svg");
assert(plainSvg?.bytes.toString().includes('width="512"') === true, "svg display size");
const tinySvg = normalizeMark(
  Buffer.from('<svg height="18" viewBox="4 4 188 188" width="18" xmlns="http://www.w3.org/2000/svg"></svg>'),
  "image/svg+xml",
);
assert(tinySvg?.bytes.toString().includes('width="512"') === true, "tiny svg enlarged");
assert(tinySvg?.bytes.toString().includes("viewBox") === true, "tiny svg keeps viewBox");
assert(tinySvg?.bytes.toString().includes('width="18"') !== true, "tiny svg size removed");

const icoPng = Buffer.alloc(24);
icoPng.set(png.subarray(0, 24));
const ico = Buffer.alloc(22 + icoPng.length);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico[6] = 128;
ico[7] = 128;
ico.writeUInt32LE(icoPng.length, 14);
ico.writeUInt32LE(22, 18);
icoPng.copy(ico, 22);
assert(normalizeMark(ico, "image/x-icon")?.type === "image/png", "ico png");
assert(normalizeMark(ico, "image/x-icon")?.width === 180, "ico size");

const france = pairDoors([
  doorCard("a", "Protests spread across France as unions join student demonstrations", "World", "New York Times"),
  doorCard("b", "Protests sweep France closing schools after student walkouts", "World", "Washington Post"),
  doorCard("c", "NASA SpaceX crew farewell from the station", "Science", "YouTube / NASA"),
]);
assert(france.length === 2, `doors ${france.length}`);
assert(france[0]?.door?.id === "b", france[0]?.door?.id || "france stories did not pair");
assert(france[1]?.id === "c", "unrelated card stays");
assert(cleanLine("too short") === null, "short line");
assert(cleanLine("Read the original at https://example.com today please") === null, "line with a link");
assert(cleanLine("Protests closed schools across France this morning.")?.includes("France") === true, "clean line");
const weighted = preferSources([{ sourceName: "A" }, { sourceName: "B" }, { sourceName: "C" }], new Map([["C", 2]]));
assert(weighted[0]?.sourceName === "C", weighted.map((row) => row.sourceName).join(","));
const lead = leadParagraphs(
  `<article><p>Oil companies asked the Supreme Court to stop climate lawsuits before a jury hears them.</p><p>${"Cities say the cases should stay in state court because the harm is local. ".repeat(3)}</p><p>Cookie policy and subscribe to our newsletter for more updates today.</p><p>${"A later hearing would decide whether federal law blocks the claims. ".repeat(3)}</p><p>Shelved under Technology. This Technology note is written for the shelf.</p></article>`,
  "Big Oil asks Supreme Court to kill climate lawsuits",
);
assert(lead.length === 3, `lead count ${lead.length}`);
assert(lead[0]?.includes("Supreme Court") === true, lead[0] || "missing lead");
assert(lead.every((paragraph) => !/cookie|written for the shelf/i.test(paragraph)), "lead skipped boilerplate");
const shown = visibleLead(lead);
assert(shown.length > 40 && shown.length <= 700, `visible lead ${shown.length}`);
assert(!/written for the shelf|Shelved under/i.test(shown), "visible lead stays source text");

console.log("remixer and embed checks passed");

function doorCard(id: string, title: string, category: string, sourceName: string) {
  return {
    id,
    title,
    category,
    sourceName,
    createdAt: "2026-10-06T12:00:00.000Z",
    tldr: title,
    sourceUrl: "https://example.com/story",
    slug: id,
    door: null as DoorPeek | null,
  };
}
