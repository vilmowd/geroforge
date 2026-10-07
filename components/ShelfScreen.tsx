import { CategoryTabs } from "@/components/CategoryTabs";
import { JsonLd } from "@/components/JsonLd";
import { MediaShelf } from "@/components/MediaShelf";
import { ReadShelf } from "@/components/ReadShelf";
import { RefreshFeed } from "@/components/RefreshFeed";
import { SkeletonCard } from "@/components/SkeletonCard";
import { WatchSession } from "@/components/WatchSession";
import { getCurrentUser } from "@/lib/auth";
import { FEED_PAGE_SIZE, getFeedPage, parseFilter, type FeedFilter } from "@/lib/feed";
import { mixSeed } from "@/lib/mix";
import { websiteJsonLd } from "@/lib/seo";

export function ShelfScreen({
  filter = "all",
  category,
  heading,
  jsonLd = false,
}: {
  filter?: FeedFilter;
  category?: string;
  heading?: string;
  jsonLd?: boolean;
}) {
  const title = heading || "The whole internet, one swipe.";

  return (
    <div>
      {jsonLd ? <JsonLd data={websiteJsonLd()} /> : null}
      <div className={heading ? "mb-3 sm:mb-4 sm:max-w-xl sm:pt-2" : "sr-only sm:not-sr-only sm:mb-4 sm:max-w-xl sm:pt-2"}>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-cream sm:text-5xl sm:leading-[1.05]">{title}</h1>
      </div>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-3 flex items-center justify-end gap-2 px-3 py-1 sm:static sm:mx-0 sm:justify-start sm:px-0 sm:py-0">
        <CategoryTabs active={category ? null : filter} />
        {filter === "videos" || filter === "reels" ? null : <ReadShelf />}
        <RefreshFeed />
      </div>
      <div className="mt-3 sm:mt-4">
        <WatchSession fallback={<ShelfSkeleton />}>
          <ShelfResults filter={filter} category={category} />
        </WatchSession>
      </div>
    </div>
  );
}

async function ShelfResults({ filter, category }: { filter: FeedFilter; category?: string }) {
  const user = await getCurrentUser();
  const page = await getFeedPage(filter, user?.id, null, FEED_PAGE_SIZE, { mix: mixSeed(), category });
  return (
    <MediaShelf
      key={`${category || filter}:${page.mix}`}
      initialPosts={page.posts}
      initialCursor={page.nextCursor}
      filter={filter}
      category={category}
      mix={page.mix}
      authenticated={Boolean(user)}
      caughtUp={page.caughtUp}
    />
  );
}

function ShelfSkeleton() {
  return (
    <div className="collage" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <SkeletonCard key={index} index={index} />
      ))}
    </div>
  );
}

export function shelfFilter(value: string | undefined): FeedFilter {
  return parseFilter(value);
}
