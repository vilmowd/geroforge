export function timeAgo(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || value.length > 300) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.includes("\\") || value.includes("@")) return "/";
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/";
  if (/%(?:2f|5c|00)/i.test(value)) return "/";
  if (value.startsWith("/login") || value.startsWith("/signup") || value.startsWith("/auth")) return "/";
  return value;
}
