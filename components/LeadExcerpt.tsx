const FADE = "max-h-[5lh] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_0%,#000_calc(100%-1lh),transparent)]";

export function LeadExcerpt({ text, className = "" }: { text: string; className?: string }) {
  const passage = text.replace(/\s+/g, " ").trim();
  if (!passage) return null;
  return <p className={`${FADE} ${className}`}>{passage}</p>;
}
