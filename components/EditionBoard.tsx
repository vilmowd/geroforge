import Link from "next/link";
import { Briefcase, Clapperboard, CloudSun, Code2, Cpu, FlaskConical, Globe2, HeartPulse, MessageCircle, Orbit, Palette, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { SourceFavicon } from "@/components/SourceFavicon";
import { getCurrentUser } from "@/lib/auth";
import { deskLine } from "@/lib/desks";
import { buildEdition, loadDeskCounts, loadDiscussed, loadEditionStories, loadKeptShow, type DiscussedStory, type EditionStory, type KeptShow } from "@/lib/edition";
import { readFollows } from "@/lib/follows";
import { timeAgo } from "@/lib/format";
import { DESKS } from "@/lib/pipeline";
import { siteHost } from "@/lib/site-mark";

const DESK_LOOK: Record<(typeof DESKS)[number], { wash: string; icon: LucideIcon }> = {
  AI: { wash: "from-[#6d4dff] to-[#a78bfa]", icon: Sparkles },
  Development: { wash: "from-[#0f766e] to-[#5eead4]", icon: Code2 },
  Science: { wash: "from-[#0369a1] to-[#7dd3fc]", icon: FlaskConical },
  Entertainment: { wash: "from-[#be123c] to-[#fb7185]", icon: Clapperboard },
  Technology: { wash: "from-[#b45309] to-[#fcd34d]", icon: Cpu },
  World: { wash: "from-[#1d4ed8] to-[#93c5fd]", icon: Globe2 },
  Sports: { wash: "from-[#15803d] to-[#86efac]", icon: Trophy },
  Space: { wash: "from-[#1e1b4b] to-[#818cf8]", icon: Orbit },
  Culture: { wash: "from-[#9d174d] to-[#f9a8d4]", icon: Palette },
  Business: { wash: "from-[#334155] to-[#94a3b8]", icon: Briefcase },
  Health: { wash: "from-[#be185d] to-[#fda4af]", icon: HeartPulse },
  Climate: { wash: "from-[#0f766e] to-[#99f6e4]", icon: CloudSun },
};

export function EditionSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="skeleton h-48 rounded-[28px]" />
      <div className="grid gap-3 lg:grid-cols-5">
        <div className="skeleton h-72 rounded-[28px] lg:col-span-3" />
        <div className="skeleton h-72 rounded-[28px] lg:col-span-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="skeleton h-40 rounded-[22px]" />
        ))}
      </div>
    </div>
  );
}

export async function EditionBoard() {
  const storiesPromise = loadEditionStories();
  const keptPromise = loadKeptShow();
  const discussedPromise = loadDiscussed();
  const countsPromise = loadDeskCounts();
  const user = await getCurrentUser();
  const [stories, follows, kept, discussed, deskCounts] = await Promise.all([
    storiesPromise,
    readFollows(user?.id),
    keptPromise,
    discussedPromise,
    countsPromise,
  ]);
  const held = new Set(kept.map((item) => item.postId));
  const edition = buildEdition(
    stories.filter((story) => !held.has(story.id)),
    follows,
    new Date(),
    kept.map((item) => item.title),
  );
  const faces = [edition.lead, ...edition.beside, edition.clip].filter((story): story is EditionStory => Boolean(story));

  return (
    <section>
      <header className="overflow-hidden rounded-[28px] bg-white shadow-card">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-gradient-to-br from-[#6d4dff] via-[#8a6cff] to-[#f0b429] px-5 py-6 text-white sm:px-7 sm:py-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Daily digest</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">{edition.name}</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/90">Your daily content in one place.</p>
            <div className="mt-5 flex items-center">
              {faces.slice(0, 4).map((story, index) => (
                <span key={story.id} className={`inline-flex rounded-2xl bg-white p-1 shadow-sm ${index === 0 ? "" : "-ml-2"}`}>
                  <SourceFavicon host={siteHost(story.sourceUrl, null)} large />
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 p-1">
            {faces.slice(0, 4).map((story, index) => (
              <Link key={story.id} href={`/posts/${story.id}`} className="relative block min-h-24 overflow-hidden rounded-2xl">
                <StoryArt story={story} frame="h-full min-h-24" eager={index === 0} />
              </Link>
            ))}
          </div>
        </div>
      </header>

      {edition.lead ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          <Lead story={edition.lead} following={follows.sources.includes(edition.lead.sourceName)} />
          <div className="flex flex-col gap-3 lg:col-span-2">
            {edition.beside.map((story) => (
              <StoryCard key={story.id} story={story} kicker="Beside the lead" />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-[28px] bg-white px-5 py-8 text-sm text-mist shadow-card">This sitting is still filling.</p>
      )}

      {edition.clip ? (
        <div className="mt-3">
          <StoryCard story={edition.clip} kicker="The clip" wide />
        </div>
      ) : null}

      {edition.five.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-lg font-extrabold text-cream">{edition.show}</h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {edition.five.map((story, index) => (
              <li key={`${story.id}-${index}`}>
                <Link href={`/posts/${story.id}`} className="block overflow-hidden rounded-[22px] bg-white shadow-card">
                  <span className="relative block">
                    <StoryArt story={story} frame="h-28" />
                    <span className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-extrabold text-copper shadow-sm">
                      {index + 1}
                    </span>
                  </span>
                  <span className="block px-3 py-3">
                    <span className="block text-sm font-extrabold leading-snug text-cream">{story.title}</span>
                    <span className="mt-2 flex items-center gap-1.5 text-xs text-mist">
                      <SourceFavicon host={siteHost(story.sourceUrl, null)} />
                      <span className="truncate">{story.sourceName}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {kept.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-lg font-extrabold text-cream">What the room kept</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {kept.map((item) => (
              <li key={item.id}>
                <KeptCard item={item} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {edition.earlier.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-lg font-extrabold text-cream">Still on the shelf</h2>
          <p className="mt-1 text-sm text-mist">Yesterday stays here. New posts are added on top.</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {edition.earlier.map((story) => (
              <li key={story.id} className="[contain-intrinsic-size:auto_220px] [content-visibility:auto]">
                <StoryCard story={story} picture />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {edition.wire.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-lg font-extrabold text-cream">The wire</h2>
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {edition.wire.map((story) => (
              <li key={story.id} className="w-52 shrink-0">
                <StoryCard story={story} picture />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {edition.bundleTitle && edition.bundle.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-lg font-extrabold text-cream">{edition.bundleTitle}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {edition.bundle.map((story) => (
              <li key={story.id}>
                <StoryCard story={story} kicker={story.category} picture />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="text-lg font-extrabold text-cream">The desks</h2>
        <p className="mt-1 text-sm text-mist">Follow a desk and it leads your shelf.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DESKS.map((desk) => {
            const look = DESK_LOOK[desk];
            const Icon = look.icon;
            return (
              <li key={desk} className="overflow-hidden rounded-[22px] bg-white shadow-card">
                <div className={`flex items-center gap-3 bg-gradient-to-r ${look.wash} px-4 py-3 text-white`}>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Link href={`/topics/${desk.toLowerCase()}`} className="text-sm font-extrabold text-white">
                    {desk}
                  </Link>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs leading-5 text-mist">{deskLine(desk)}</p>
                  <p className="mt-2 text-[11px] font-semibold text-cream">
                    {(deskCounts.get(desk) ?? 0) > 0 ? `${deskCounts.get(desk)} on the shelf` : "Just opened"}
                  </p>
                  <div className="mt-3">
                    <FollowButton kind="desk" value={desk} initial={follows.desks.includes(desk)} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <DiscussedFloor stories={discussed} />
    </section>
  );
}

function DiscussedFloor({ stories }: { stories: DiscussedStory[] }) {
  const loudest = stories[0]?.comments ?? 0;
  return (
    <section className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-card">
      <div className="flex items-end justify-between gap-4 bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#9a3412] px-5 py-5 text-white">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">The floor</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Most discussed</h2>
          <p className="mt-1 max-w-md text-sm text-white/80">The posts people stopped to answer.</p>
        </div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>
      {stories.length === 0 ? (
        <p className="px-5 py-8 text-sm text-mist">No thread has started. The first comment opens this board.</p>
      ) : (
        <ol>
          {stories.map((story, index) => {
            const width = loudest > 0 ? Math.max(12, Math.round((story.comments / loudest) * 100)) : 12;
            return (
              <li key={story.id} className={index === 0 ? "" : "border-t border-black/5"}>
                <Link href={`/posts/${story.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-8 shrink-0 text-2xl font-extrabold tabular-nums ${index === 0 ? "text-copper" : "text-mist"}`}>{index + 1}</span>
                  {index === 0 ? (
                    <span className="hidden w-24 shrink-0 overflow-hidden rounded-2xl sm:block">
                      <StoryArt story={story} frame="h-16" />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-cream">{story.title}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-mist">
                      <SourceFavicon host={siteHost(story.sourceUrl, null)} />
                      <span className="truncate">
                        {story.sourceName}
                        <span aria-hidden="true"> · </span>
                        {story.category}
                      </span>
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-black/5" aria-hidden="true">
                      <span className="block h-full rounded-full bg-copper" style={{ width: `${width}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs font-bold text-cream">
                    {story.comments}
                    <span className="mt-0.5 block font-semibold text-mist">{story.comments === 1 ? "comment" : "comments"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Lead({ story, following }: { story: EditionStory; following: boolean }) {
  return (
    <article className="overflow-hidden rounded-[28px] bg-white shadow-card lg:col-span-3">
      <Link href={`/posts/${story.id}`} className="block">
        <StoryArt story={story} frame="h-56 sm:h-72" eager />
      </Link>
      <div className="p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-copper">The lead</p>
        <Link href={`/posts/${story.id}`} className="mt-2 block text-2xl font-extrabold leading-tight text-cream">
          {story.title}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SourceFavicon host={siteHost(story.sourceUrl, null)} large />
          <p className="text-xs text-mist">
            {story.sourceName}
            <span aria-hidden="true"> · </span>
            {story.category}
            <span aria-hidden="true"> · </span>
            {timeAgo(story.createdAt)}
          </p>
          <FollowButton kind="source" value={story.sourceName} initial={following} label="this source" />
        </div>
      </div>
    </article>
  );
}

function StoryCard({
  story,
  kicker,
  wide = false,
  picture = false,
}: {
  story: EditionStory;
  kicker?: string;
  wide?: boolean;
  picture?: boolean;
}) {
  const showArt = wide || picture || Boolean(kicker);
  return (
    <article className={`overflow-hidden rounded-[22px] bg-white shadow-card ${wide ? "" : "h-full"}`}>
      {showArt ? (
        <Link href={`/posts/${story.id}`} className="block">
          <StoryArt story={story} frame={wide ? "h-40 sm:h-48" : "h-28"} />
        </Link>
      ) : null}
      <div className="p-4">
        {kicker ? <p className="text-[11px] font-bold uppercase tracking-wide text-copper">{kicker}</p> : null}
        <Link href={`/posts/${story.id}`} className={`block font-extrabold leading-snug text-cream ${kicker ? "mt-1 text-base" : "text-sm"}`}>
          {story.title}
        </Link>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-mist">
          <SourceFavicon host={siteHost(story.sourceUrl, null)} />
          <span className="min-w-0 truncate">
            {story.sourceName}
            <span aria-hidden="true"> · </span>
            {timeAgo(story.createdAt)}
          </span>
        </p>
      </div>
    </article>
  );
}

function KeptCard({ item }: { item: KeptShow }) {
  const story: EditionStory = {
    id: item.postId,
    title: item.title,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    category: item.category,
    createdAt: "",
    format: "article",
    thumbnailUrl: item.thumbnailUrl,
  };
  return (
    <Link href={`/posts/${item.postId}`} className="flex overflow-hidden rounded-[22px] bg-white shadow-card">
      <span className="w-28 shrink-0">
        <StoryArt story={story} frame="h-full min-h-24" />
      </span>
      <span className="min-w-0 px-3 py-3">
        <span className="block text-sm font-extrabold leading-snug text-cream">{item.title}</span>
        <span className="mt-2 flex items-center gap-1.5 text-xs text-mist">
          <SourceFavicon host={siteHost(item.sourceUrl, null)} />
          <span className="truncate">
            {item.keeper} kept {item.sourceName}
          </span>
        </span>
      </span>
    </Link>
  );
}

function StoryArt({ story, frame, eager = false }: { story: EditionStory; frame: string; eager?: boolean }) {
  const wash = DESK_LOOK[story.category as (typeof DESKS)[number]]?.wash || "from-[#6d4dff] to-[#f0b429]";
  if (story.thumbnailUrl) {
    return (
      <img
        src={story.thumbnailUrl}
        alt=""
        width={640}
        height={360}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "low"}
        referrerPolicy="no-referrer"
        className={`${frame} w-full object-cover`}
      />
    );
  }
  return (
    <span className={`flex items-center justify-center bg-gradient-to-br ${wash} ${frame} w-full`}>
      <span className="rounded-2xl bg-white p-2 shadow-sm">
        <SourceFavicon host={siteHost(story.sourceUrl, null)} hero />
      </span>
    </span>
  );
}
