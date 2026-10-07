import type { ShelfFormat } from "@/lib/remixer";

export type Source = {
  kind: "reddit" | "rss" | "youtube";
  url: string;
  sourceName: string;
  categoryHint?: string;
  format: ShelfFormat;
};

function channelTail(channelId: string): string {
  return channelId.startsWith("UC") ? channelId.slice(2) : channelId;
}

function youtube(channelId: string, sourceName: string, categoryHint: string): Source {
  return {
    kind: "youtube",
    url: `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${channelTail(channelId)}`,
    sourceName,
    categoryHint,
    format: "video",
  };
}

function youtubeShorts(channelId: string, name: string, categoryHint: string): Source {
  return {
    kind: "youtube",
    url: `https://www.youtube.com/feeds/videos.xml?playlist_id=UUSH${channelTail(channelId)}`,
    sourceName: `YouTube Shorts / ${name}`,
    categoryHint,
    format: "reel",
  };
}

function feed(url: string, sourceName: string, categoryHint: string, format: ShelfFormat): Source {
  return { kind: "rss", url, sourceName, categoryHint, format };
}

function reddit(subreddit: string, categoryHint: string, format: ShelfFormat): Source {
  return {
    kind: "reddit",
    url: `https://www.reddit.com/r/${subreddit}/top.json?limit=25&t=day`,
    sourceName: `Reddit /r/${subreddit}`,
    categoryHint,
    format,
  };
}

function redditPopular(name: string, subs: string[], categoryHint: string, format: ShelfFormat): Source {
  return {
    kind: "reddit",
    url: `https://www.reddit.com/r/${subs.join("+")}/top.json?limit=25&t=day`,
    sourceName: name,
    categoryHint,
    format,
  };
}

export const SOURCES: Source[] = [
  youtube("UC16niRr50-MSBwiO3YDb3RA", "YouTube / BBC News", "World"),
  youtube("UCHnyfMqiRRG1u-2MsSQLbXA", "YouTube / Veritasium", "Science"),
  youtube("UCsXVk37bltHxD1rDPwtNM8Q", "YouTube / Kurzgesagt", "Science"),
  youtube("UCAuUUnT6oDeKwE6v1NGQxug", "YouTube / TED", "Science"),
  youtube("UCpVm7bg6pXKo1Pr6k5kxG9A", "YouTube / National Geographic", "Science"),
  youtube("UCLXo7UDZvByw2ixzpQCufnA", "YouTube / Vox", "World"),
  youtube("UCY1kMZp36IQSyNx_9h4mpCg", "YouTube / Mark Rober", "Science"),
  youtube("UCknLrEdhRCp1aegoMqRaCZg", "YouTube / DW News", "World"),
  youtube("UCBJycsmduvYEL83R_U4JriQ", "YouTube / MKBHD", "Technology"),
  youtube("UCXuqSBlHAE6Xw-yeJA0Tunw", "YouTube / Linus Tech Tips", "Technology"),
  youtube("UC7DdEm33SyaTDtWYGO2CwdA", "YouTube / Physics Girl", "Science"),
  youtube("UCYO_jab_esuFRV4b17AJtAw", "YouTube / 3Blue1Brown", "Science"),
  youtube("UCLA_DiR1FfKNvjuUpBHmylQ", "YouTube / NASA", "Space"),
  youtube("UCoxcjq-8xIDTYp3uz647V5A", "YouTube / Numberphile", "Science"),
  youtube("UCC552Sd-3nyi_tk2BudLUzA", "YouTube / AsapSCIENCE", "Science"),
  youtube("UChqUTb7kYRX8-EiaN3XFrSQ", "YouTube / Reuters", "World"),
  youtube("UC52X5wxOL_s5yw0dQk7NtgA", "YouTube / Associated Press", "World"),
  youtube("UCNye-wNBqNL5ZzHSJj3l8Bg", "YouTube / Al Jazeera English", "World"),
  youtube("UCCCPCZNChQdGa9EkATeye4g", "YouTube / FRANCE 24", "World"),
  youtube("UC9x0AN7BWHpCDHSm9NiJFJQ", "YouTube / NetworkChuck", "Technology"),
  youtube("UC8butISFwT-Wl7EV0hUK0BQ", "YouTube / freeCodeCamp", "Development"),
  youtubeShorts("UCq8DICunczvLuJJq414110A", "Zach King", "Entertainment"),
  youtubeShorts("UCPDis9pjXuqyI7RYLJ-TTSA", "FailArmy", "Entertainment"),
  youtubeShorts("UCX6OQ3DkcsbYNE6H8uQQuVA", "MrBeast", "Entertainment"),
  youtubeShorts("UCRijo3ddMTht_IHyNSNXpNQ", "Dude Perfect", "Entertainment"),
  youtubeShorts("UC5f5IV0Bf79YLp_p9nfInRA", "How Ridiculous", "Entertainment"),
  youtubeShorts("UCo8bcnLyZH8tBIH9V1mLgqQ", "TheOdd1sOut", "Entertainment"),
  youtubeShorts("UCHu2KNu6TtJ0p4hpSW7Yv7Q", "Jazza", "Culture"),
  youtubeShorts("UCSpFnDQr88xCZ80N-X7t0nQ", "Corridor Crew", "Entertainment"),
  youtubeShorts("UCWJ2lWNubArHWmf3FIHbfcQ", "NBA", "Sports"),
  youtubeShorts("UCB_qr75-ydFVKSF9Dmo6izg", "FORMULA 1", "Sports"),
  youtubeShorts("UCblfuW_4rakIf2h6aqANefA", "Red Bull", "Sports"),
  youtubeShorts("UC3KEoMzNz8eYnwBC34RaKCQ", "Simone Giertz", "Entertainment"),
  youtubeShorts("UCp68_FLety0O-n9QU6phsgw", "colinfurze", "Entertainment"),
  youtubeShorts("UCajXeitgFL-rb5-gXI-aG8Q", "Great Big Story", "Culture"),

  feed("https://vimeo.com/channels/staffpicks/videos/rss", "Vimeo / Staff Picks", "Culture", "video"),

  feed("https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "The Verge / AI", "AI", "article"),
  feed("https://openai.com/news/rss.xml", "OpenAI News", "AI", "article"),
  feed("https://hnrss.org/frontpage", "Hacker News", "Development", "article"),
  feed("https://feeds.bbci.co.uk/news/rss.xml", "BBC News", "World", "news"),
  feed("https://feeds.bbci.co.uk/news/world/rss.xml", "BBC World", "World", "world"),
  feed("https://feeds.bbci.co.uk/news/technology/rss.xml", "BBC Technology", "Technology", "article"),
  feed("https://feeds.npr.org/1001/rss.xml", "NPR News", "World", "news"),
  feed("https://feeds.npr.org/1019/rss.xml", "NPR Technology", "Technology", "article"),
  feed("https://www.aljazeera.com/xml/rss/all.xml", "Al Jazeera", "World", "world"),
  feed("https://www.theguardian.com/world/rss", "The Guardian / World", "World", "world"),
  feed("https://www.theguardian.com/technology/rss", "The Guardian / Technology", "Technology", "article"),
  feed("https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "New York Times / World", "World", "world"),
  feed("https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", "New York Times / Technology", "Technology", "article"),
  feed("https://feeds.washingtonpost.com/rss/world", "Washington Post / World", "World", "world"),
  feed("https://www.pbs.org/newshour/feeds/rss/headlines", "PBS NewsHour", "World", "news"),
  feed("https://www.theverge.com/rss/index.xml", "The Verge", "Technology", "article"),
  feed("https://www.wired.com/feed/rss", "Wired", "Technology", "article"),
  feed("https://techcrunch.com/feed/", "TechCrunch", "Technology", "article"),
  feed("https://feeds.arstechnica.com/arstechnica/index", "Ars Technica", "Technology", "article"),
  feed("https://lobste.rs/rss", "Lobsters", "Development", "post"),
  feed("https://hnrss.org/ask", "Hacker News / Ask", "Development", "post"),
  feed("https://hnrss.org/show", "Hacker News / Show", "Development", "post"),
  feed("https://programming.dev/feeds/c/programming.xml?sort=Hot", "Lemmy / Programming", "Development", "post"),
  feed("https://lemmy.world/feeds/c/technology.xml?sort=Hot", "Lemmy / Technology", "Technology", "post"),
  feed("https://lemmy.world/feeds/c/science.xml?sort=Hot", "Lemmy / Science", "Science", "post"),
  feed("https://lemmy.world/feeds/c/world.xml?sort=Hot", "Lemmy / World", "World", "post"),
  feed("https://lemmy.world/feeds/c/news.xml?sort=Hot", "Lemmy / News", "World", "post"),
  feed("https://lemmy.world/feeds/c/entertainment.xml?sort=Hot", "Lemmy / Entertainment", "Entertainment", "post"),
  feed("https://www.producthunt.com/feed", "Product Hunt", "Technology", "post"),
  reddit("artificial", "AI", "post"),
  reddit("programming", "Development", "post"),
  reddit("worldnews", "World", "post"),
  reddit("videos", "Entertainment", "video"),
  reddit("technology", "Technology", "post"),
  reddit("nextfuckinglevel", "Entertainment", "video"),
  reddit("BeAmazed", "Entertainment", "video"),
  reddit("Damnthatsinteresting", "Science", "video"),
  reddit("interestingasfuck", "Entertainment", "video"),
  reddit("ContagiousLaughter", "Entertainment", "video"),
  reddit("TikTok", "Entertainment", "reel"),
  reddit("oddlysatisfying", "Entertainment", "reel"),
  reddit("youtubehaiku", "Entertainment", "reel"),
  reddit("TikTokCringe", "Entertainment", "reel"),
  reddit("BetterEveryLoop", "Entertainment", "reel"),
  reddit("AnimalsBeingDerps", "Entertainment", "reel"),
  reddit("AnimalsBeingBros", "Entertainment", "reel"),
  reddit("ArtisanVideos", "Entertainment", "reel"),
  reddit("cookingvideos", "Entertainment", "reel"),
  reddit("blackmagicfuckery", "Entertainment", "reel"),
  reddit("perfectfit", "Entertainment", "reel"),
  reddit("MadeMeSmile", "Entertainment", "post"),
  reddit("InternetIsBeautiful", "Technology", "post"),
  redditPopular(
    "Reddit / popular clips",
    [
      "TikTok",
      "youtubehaiku",
      "oddlysatisfying",
      "BetterEveryLoop",
      "AnimalsBeingDerps",
      "AnimalsBeingBros",
      "ArtisanVideos",
      "cookingvideos",
      "blackmagicfuckery",
      "perfectfit",
      "TikTokCringe",
    ],
    "Entertainment",
    "reel",
  ),
  redditPopular(
    "Reddit / popular videos",
    ["videos", "nextfuckinglevel", "BeAmazed", "interestingasfuck", "ContagiousLaughter", "Damnthatsinteresting"],
    "Entertainment",
    "video",
  ),
];
