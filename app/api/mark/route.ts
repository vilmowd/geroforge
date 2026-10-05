import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { loadSiteMark } from "@/lib/site-mark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = new URL(request.url).searchParams.get("host")?.trim().toLowerCase() || "";
  if (!/^[a-z0-9.-]{1,253}$/.test(host)) {
    return new NextResponse(null, { status: 400 });
  }
  const ip = clientIp(request.headers) || "local";
  if (!rateLimit(`mark:${ip}`, 90, 5 * 60 * 1000)) {
    return new NextResponse(null, { status: 429 });
  }
  const mark = await loadSiteMark(host);
  if (!mark) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(mark.bytes), {
    headers: {
      "Content-Type": mark.type,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
