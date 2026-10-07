import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { getCurrentUser } from "@/lib/auth";
import { getFeedPage, parseFilter } from "@/lib/feed";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ip = clientIp(request.headers);
  const limited = ip ? !rateLimit(`feed:${ip}`, 120, 60_000) : !rateLimit("feed:direct", 2000, 60_000);
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const url = new URL(request.url);
  const filter = parseFilter(url.searchParams.get("filter") || undefined);
  const cursor = url.searchParams.get("cursor");
  const mix = url.searchParams.get("mix") || undefined;
  const user = await getCurrentUser();
  const category = url.searchParams.get("category") || undefined;
  const page = await getFeedPage(filter, user?.id, cursor, undefined, { mix, category });
  return NextResponse.json(page, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
