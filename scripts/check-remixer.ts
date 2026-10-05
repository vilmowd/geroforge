import { remixText } from "../lib/remixer";
import { isAllowedEmbedUrl, playbackEmbedSrc, toEmbedUrl } from "../lib/embed";
import { cardPicture, imageFromMarkup, openGraphImage, pictureSources } from "../lib/thumbnails";
import { spreadSources } from "../lib/pipeline";

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
assert(playback?.hostname === "www.youtube.com", playing || "missing playback embed");
assert(playback?.searchParams.get("autoplay") === "1", "playback autoplay");
assert(playback?.searchParams.get("mute") === "1", "phone playback must start muted");
assert(playback?.searchParams.get("playsinline") === "1", "playback playsinline");

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

console.log("remixer and embed checks passed");
