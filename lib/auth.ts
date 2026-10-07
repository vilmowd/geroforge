import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { findUserByEmail, packMagicEmail, persistSeal, presentUser, unpackMagicEmail } from "@/lib/identity";
import { newPublicId } from "@/lib/public-id";
import { emailKey, seal } from "@/lib/seal";
import { uniqueUsername } from "@/lib/username";

function isNextControlFlow(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = String((error as { digest?: unknown }).digest || "");
  return (
    digest === "DYNAMIC_SERVER_USAGE" ||
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_NOT_FOUND") ||
    digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
  );
}

export const SESSION_COOKIE = "forge_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAGIC_TTL_MS = 20 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(`${token}:${getEnv().authSecret}`).digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export const getCurrentUser = cache(async function getCurrentUser() {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) return null;
    const stored = await persistSeal(session.user);
    return presentUser(stored);
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    console.error("[forge] session lookup failed", error);
    return null;
  }
});

export async function openSession(userId: string): Promise<string> {
  const sessionToken = randomBytes(32).toString("hex");
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  const existing = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const overflow = existing.slice(4);
  if (overflow.length > 0) {
    await prisma.session.deleteMany({ where: { id: { in: overflow.map((row) => row.id) } } });
  }
  await prisma.session.create({
    data: {
      tokenHash: hashToken(sessionToken),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    },
  });
  return sessionToken;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function requestMagicLink(emailInput: string, nextPath: string): Promise<{
  ok: boolean;
  message: string;
  devLink?: string;
}> {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const env = getEnv();
  if (env.nodeEnv === "production" && !env.resendApiKey) {
    return { ok: false, message: "Email delivery is not configured on this server." };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.magicLink.count({
    where: {
      createdAt: { gt: since },
      OR: [{ email: { startsWith: `${emailKey(email)}:` } }, { email }],
    },
  });
  if (recent >= 5) {
    return { ok: false, message: "Try again later." };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.magicLink.create({
    data: {
      email: packMagicEmail(email),
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + MAGIC_TTL_MS),
    },
  });

  const link = `${env.appUrl}/auth/verify?token=${token}&next=${encodeURIComponent(nextPath)}`;
  if (env.resendApiKey) {
    const sent = await sendMagicEmail(env.resendApiKey, env.emailFrom, email, link);
    if (!sent) {
      return { ok: false, message: "The sign-in email could not be sent. Try again shortly." };
    }
    return { ok: true, message: "Check your inbox for a sign-in link. It expires in 20 minutes." };
  }

  return {
    ok: true,
    message: "Email delivery is not configured, so the sign-in link is shown here for local development.",
    devLink: link,
  };
}

export async function consumeMagicLink(token: string | null): Promise<{ sessionToken: string } | null> {
  if (!token || token.length < 32 || token.length > 128) return null;
  const link = await prisma.magicLink.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!link || link.usedAt || link.expiresAt < new Date()) return null;

  const claimed = await prisma.magicLink.updateMany({
    where: { id: link.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  const email = unpackMagicEmail(link.email);
  if (!email) return null;
  const existing = await findUserByEmail(email);
  const user =
    existing ??
    (await prisma.user.create({
      data: {
        publicId: newPublicId(),
        email: seal(email),
        emailHash: emailKey(email),
        name: seal(await uniqueUsername()),
      },
    }));

  const sessionToken = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      tokenHash: hashToken(sessionToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    },
  });

  return { sessionToken };
}

async function sendMagicEmail(apiKey: string, from: string, to: string, link: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "Your GeroForge sign-in link",
        html: `<p>Use this link to sign in to GeroForge. It expires in 20 minutes.</p><p><a href="${link}">Sign in</a></p><p>If you did not request this, you can ignore the email.</p>`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.error(`[forge] resend failed with HTTP ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[forge] resend request failed", error);
    return false;
  }
}

