export function TldrBox({ text }: { text: string }) {
  if (!text) return null;

  return (
    <aside className="rounded-2xl bg-white px-3 py-3 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-wide text-copper">TL;DR</p>
      <p className="mt-1 line-clamp-4 text-sm leading-5 text-cream">{text}</p>
    </aside>
  );
}
