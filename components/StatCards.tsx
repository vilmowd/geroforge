export function StatCards({ stats }: { stats: { value: string; label: string }[] }) {
  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <article
          key={`${stat.value}-${stat.label}`}
          className="rounded-2xl bg-white px-2 py-2.5 text-center shadow-card"
        >
          <p className="text-sm font-extrabold leading-tight text-copper sm:text-base">{stat.value}</p>
        </article>
      ))}
    </div>
  );
}
