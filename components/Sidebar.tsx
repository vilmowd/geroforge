import { timeAgo } from "@/lib/format";

export function Sidebar({
  stats,
}: {
  stats: {
    postCount: number;
    videoCount: number;
    communityCount: number;
    commentCount: number;
    lastScrape: { status: "SUCCESS" | "ERROR"; createdAt: string } | null;
    trending: { category: string; count: number }[];
  };
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist">Trending</h2>
        {stats.trending.length === 0 ? (
          <p className="mt-3 text-sm text-mist">Categories show up after the first posts land.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stats.trending.map((topic) => (
              <li key={topic.category} className="flex items-center justify-between text-sm">
                <span>{topic.category}</span>
                <span className="font-mono text-mist">{topic.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist">Platform</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Stat label="Posts" value={stats.postCount} />
          <Stat label="Video embeds" value={stats.videoCount} />
          <Stat label="Community" value={stats.communityCount} />
          <Stat label="Comments" value={stats.commentCount} />
        </dl>
        <p className="mt-4 text-xs leading-5 text-mist">
          {stats.lastScrape
            ? `${stats.lastScrape.status === "SUCCESS" ? "Last pass succeeded" : "Last pass failed"} ${timeAgo(stats.lastScrape.createdAt)}.`
            : "Worker is armed. The first pass runs on the schedule, or just after boot when enabled."}
        </p>
      </section>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-mist">{label}</dt>
      <dd className="font-mono text-cream">{value}</dd>
    </div>
  );
}
