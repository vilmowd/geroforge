export function FamePoints({ points }: { points: number }) {
  const safe = Number.isFinite(points) ? Math.max(0, points) : 0;
  return (
    <span className="whitespace-nowrap text-[11px] font-bold tabular-nums text-copper" aria-label={`${safe} fame points`}>
      {safe} FP
    </span>
  );
}
