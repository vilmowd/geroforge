import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { kickIngestion } from "@/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorized(request)) {
    if (!rateLimit("cron:denied", 30, 60_000)) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!rateLimit("cron:ok", 4, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  await kickIngestion();
  return NextResponse.json({ ok: true });
}

export const POST = GET;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const alt = request.headers.get("x-cron-secret") || "";
  return safeEqual(secret, bearer) || safeEqual(secret, alt);
}

function safeEqual(expected: string, received: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
