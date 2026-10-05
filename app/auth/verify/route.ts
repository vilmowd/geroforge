import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { consumeMagicLink, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { safeNextPath } from "@/lib/format";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const session = await consumeMagicLink(token);

  if (!session) {
    return NextResponse.redirect(new URL("/login?error=expired", url.origin));
  }

  const response = NextResponse.redirect(new URL(nextPath, url.origin));
  response.cookies.set(SESSION_COOKIE, session.sessionToken, sessionCookieOptions());
  return response;
}
