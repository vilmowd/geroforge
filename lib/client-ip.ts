export function clientIp(headers: { get(name: string): string | null }): string | null {
  const real = firstAddress(headers.get("x-real-ip"));
  if (plausible(real)) return real.slice(0, 80);
  const forwarded = firstAddress(headers.get("x-forwarded-for"));
  if (plausible(forwarded)) return forwarded.slice(0, 80);
  return null;
}

function firstAddress(value: string | null): string {
  return value?.split(",")[0]?.trim() || "";
}

function plausible(value: string): boolean {
  return value.length > 0 && value.length <= 80 && /^[0-9a-fA-F:.]+$/.test(value);
}
