import type { ShelfFormat } from "@/lib/remixer";

export type Source = {
  kind: "reddit" | "rss" | "youtube";
  url: string;
  sourceName: string;
  categoryHint?: string;
  format: ShelfFormat;
};

function youtube(channelId: string, sourceName: string, categoryHint: string): Source {
  return {
    kind: "youtube",
    url: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    sourceName,
    categoryHint,
    format: "video",
  };
}

function feed(url: string, sourceName: string, categoryHint: string, format: ShelfFormat): Source {
  return { kind: "rss", url, sourceName, categoryHint, format };
}

function reddit(subreddit: string, categoryHint: string, format: ShelfFormat): Source {
  return feed(
    `https://www.reddit.com/r/${subreddit}/top/.rss?t=day`,
    `Reddit /r/${subreddit}`,
    categoryHint,
    format,
  );
}

export const SOURCES: Source[] = [
  youtube("UC16niRr50-MSBwiO3YDb3RA", "YouTube / BBC News", "World"),
  youtube("UCHnyfMqiRRG1u-2MsSQLbXA", "YouTube / Veritasium", "Science"),
  youtube("UCsXVk37bltHxD1rDPwtNM8Q", "YouTube / Kurzgesagt", "Science"),
  youtube("UCAuUUnT6oDeKwE6v1NGQxug", "YouTube / TED", "Science"),
  youtube("UCpVm7bg6pXKo1Pr6k5kxG9A", "YouTube / National Geographic", "Science"),
  youtube("UCLXo7UDZvByw2ixzpQCufnA", "YouTube / Vox", "World"),
  youtube("UCY1kMZp36IQSyNx_9h4mpCg", "YouTube / Mark Rober", "Science"),
  youtube("UC6107grRI4m0o2-emgoDnAA", "YouTube / SmarterEveryDay", "Science"),
  youtube("UCknLrEdhRCp1aegoMqRaCZg", "YouTube / DW News", "World"),
  youtube("UCX6OQ3DkcsbYNE6H8uQQuVA", "YouTube / MrBeast", "Entertainment"),
  youtube("UCBJycsmduvYEL83R_U4JriQ", "YouTube / MKBHD", "Technology"),
  youtube("UCXuqSBlHAE6Xw-yeJA0Tunw", "YouTube / Linus Tech Tips", "Technology"),
  youtube("UCBa659QWEk1AI4Tg--mrJ2A", "YouTube / Tom Scott", "Technology"),
  youtube("UCFhXFikryT4aFcLkLw2LBLA", "YouTube / NileRed", "Science"),
  youtube("UCUK0HBIBWgM2c4vsPhkYY4w", "YouTube / The Slow Mo Guys", "Entertainment"),
  youtube("UCRijo3ddMTht_IHyNSNXpNQ", "YouTube / Dude Perfect", "Entertainment"),
  youtube("UCvK4bOhULCpmLabd2pDMtnA", "YouTube / Yes Theory", "Entertainment"),
  youtube("UCsn6cjffsvyOZCZxvGoJxGg", "YouTube / Corridor Crew", "Entertainment"),
  youtube("UCo8bcnLyZH8tBIH9V1mLgqQ", "YouTube / TheOdd1sOut", "Entertainment"),
  youtube("UCR1D15p_vdP3HkrH8wgjQRw", "YouTube / Internet Historian", "Entertainment"),
  youtube("UCHu2KNu6TtJ0p4hpSW7Yv7Q", "YouTube / Jazza", "Entertainment"),
  youtube("UCRcgy6GzDeccI7dkbbBna3Q", "YouTube / Lemmino", "Entertainment"),
  youtube("UC7DdEm33SyaTDtWYGO2CwdA", "YouTube / Physics Girl", "Science"),
  youtube("UC5f5IV0Bf79YLp_p9nfInRA", "YouTube / How Ridiculous", "Entertainment"),
  youtube("UCJHA_jMfCvEnv-3kRjTCQXw", "YouTube / Binging with Babish", "Entertainment"),
  youtube("UCbfYPyITQ-7l4upoX8nvctg", "YouTube / Two Minute Papers", "AI"),
  youtube("UCsBjURrPoezykLs9EqgamOA", "YouTube / Fireship", "Development"),
  youtube("UCYO_jab_esuFRV4b17AJtAw", "YouTube / 3Blue1Brown", "Science"),
  youtube("UCq8DICunczvLuJJq414110A", "YouTube / Zach King", "Entertainment"),
  youtube("UCPDis9pjXuqyI7RYLJ-TTSA", "YouTube / FailArmy", "Entertainment"),

  feed("https://vimeo.com/channels/staffpicks/videos/rss", "Vimeo / Staff Picks", "Entertainment", "video"),

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
  reddit("MadeMeSmile", "Entertainment", "post"),
  reddit("InternetIsBeautiful", "Technology", "post"),
];
