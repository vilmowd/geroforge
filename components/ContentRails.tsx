import Link from "next/link";
import { PostCard } from "@/components/PostCard";
import type { FeedCard, FeedFilter } from "@/lib/feed";

export function ContentRails({
  rails,
}: {
  rails: { id: FeedFilter; label: string; posts: FeedCard[] }[];
}) {
  if (rails.length === 0) return null;

  return (
    <div className="space-y-4">
      {rails.map((rail) => (
        <section key={rail.id}>
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-cream">{rail.label}</h2>
            <Link href={`/?filter=${rail.id}`} className="text-[11px] font-semibold text-copper">
              See all
            </Link>
          </div>
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 snap-x snap-mandatory [scrollbar-width:none] sm:mx-0 sm:px-0">
            {rail.posts.map((post) => (
              <div key={post.id} className="w-[46%] shrink-0 snap-start sm:w-56">
                <PostCard post={post} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
