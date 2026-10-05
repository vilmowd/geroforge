import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let database: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch (error) {
    console.error("[forge] health check database", error);
  }

  const ok = database === "up";
  return NextResponse.json(
    {
      ok,
      database,
      worker: process.env.ENABLE_WORKER !== "false",
    },
    { status: ok ? 200 : 503 },
  );
}
