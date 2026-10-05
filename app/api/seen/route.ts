import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { rememberSeen } from "@/lib/seen";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limited = ip ? !rateLimit(`seen:${ip}`, 80, 60_000) : !rateLimit("seen:direct", 1500, 60_000);
  if (limited) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  let body: { id?: unknown };
  try {
    body = (await request.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[a-z0-9]{8,40}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  const user = await getCurrentUser();
  await rememberSeen(id, user?.id);
  return NextResponse.json({ ok: true });
}
