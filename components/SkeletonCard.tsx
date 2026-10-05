const FRAMES = ["aspect-[4/5]", "aspect-video", "aspect-square", "aspect-[3/4]"] as const;

export function SkeletonCard({ index }: { index: number; className?: string }) {
  return (
    <div className="w-full overflow-hidden rounded-[22px] bg-white shadow-card sm:rounded-[28px]" aria-hidden="true">
      <div className={`skeleton w-full ${FRAMES[index % FRAMES.length]}`} style={{ animationDelay: `${index * 40}ms` }} />
      <div className="space-y-2 p-3.5">
        <div className="skeleton h-4 w-4/5 rounded-full" />
        <div className="skeleton h-3 w-2/5 rounded-full" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
