export function Avatar({
  name,
  src,
  className = "h-10 w-10 text-sm",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt="" className={`rounded-full object-cover ${className}`} />;
  }
  const letter = (name.trim().slice(0, 1) || "?").toUpperCase();
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = (hash * 33 + name.charCodeAt(index)) >>> 0;
  const hue = hash % 360;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-extrabold text-white ${className}`}
      style={{ background: `linear-gradient(145deg, hsl(${hue} 62% 46%), hsl(${(hue + 36) % 360} 58% 32%))` }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
