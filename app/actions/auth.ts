"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { destroySession, getCurrentUser, openSession, requestMagicLink, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";
import { safeNextPath } from "@/lib/format";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { newPublicId } from "@/lib/public-id";
import { clearLoginFailure, LOGIN_FAILURE, loginCooling, noteLoginFailure } from "@/lib/login-guard";
import { rateLimit } from "@/lib/rate-limit";
import { findUserByEmail } from "@/lib/identity";
import { emailKey, seal } from "@/lib/seal";
import { uniqueUsername } from "@/lib/username";

export type LoginState = {
  error: string;
  message: string;
  devLink: string;
};

export async function requestMagicLinkAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "");
  const nextPath = safeNextPath(String(formData.get("next") || "/"));
  const result = await requestMagicLink(email, nextPath);
  return {
    error: result.ok ? "" : result.message,
    message: result.ok ? result.message : "",
    devLink: result.devLink || "",
  };
}

export type AccountState = { error: string; hold?: number };

export async function signUpAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const agreed = formData.get("agree") === "on";
  const nextPath = safeNextPath(String(formData.get("next") || "/account"));

  if (!(await allowAttempt("signup", email))) return { error: "Too many attempts. Try again in a few minutes." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { error: "Enter a valid email address." };
  if (password.length < 8 || password.length > 200) return { error: "Use a password of at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };
  if (!agreed) return { error: "Agree to the terms and the privacy policy to create an account." };

  const existing = await findUserByEmail(email);
  if (existing) return { error: "An account with that email already exists. Log in instead." };

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: seal(email),
      emailHash: emailKey(email),
      publicId: newPublicId(),
      name: seal(await uniqueUsername()),
      passwordHash,
    },
  });

  const token = await openSession(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  redirect(nextPath);
}

export async function logInAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const nextPath = safeNextPath(String(formData.get("next") || "/"));
  if (!email || !password) return { error: "Enter your email and password." };
  if (email.length > 200 || password.length > 200) return quietFailure();

  const headerList = await headers();
  const ip = clientIp(headerList);
  const accountKey = `acct:${emailKey(email)}`;
  const ipKey = ip ? `ip:${ip}` : "";
  const cooled = loginCooling(accountKey) || (ipKey ? loginCooling(ipKey) : false);
  const allowed = await allowAttempt("login", email);

  const user = await findUserByEmail(email);
  const matches = await verifyPassword(password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  if (cooled || !allowed || !user?.passwordHash || !matches) {
    if (!cooled) {
      noteLoginFailure(accountKey);
      if (ipKey) noteLoginFailure(ipKey);
    }
    return quietFailure();
  }

  clearLoginFailure(accountKey);
  if (ipKey) clearLoginFailure(ipKey);
  const token = await openSession(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  redirect(nextPath);
}

function quietFailure(): AccountState {
  return { error: LOGIN_FAILURE, hold: Date.now() };
}

async function allowAttempt(action: string, email: string): Promise<boolean> {
  const headerList = await headers();
  const ip = clientIp(headerList);
  const windowMs = 15 * 60 * 1000;
  if (!rateLimit(`${action}:site`, 300, windowMs)) return false;
  if (ip && !rateLimit(`${action}:ip:${ip}`, 20, windowMs)) return false;
  const stamp = email.includes("@") ? emailKey(email) : email;
  return rateLimit(`${action}:email:${stamp}`, 8, windowMs);
}

const AVATAR_PREFIX = "data:image/jpeg;base64,";

export async function updateAvatarAction(formData: FormData): Promise<{ error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to change your picture." };
  const raw = String(formData.get("avatar") || "");
  if (raw === "clear") {
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
    return { error: "" };
  }
  const body = raw.startsWith(AVATAR_PREFIX) ? raw.slice(AVATAR_PREFIX.length) : "";
  if (!body || raw.length > 80_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body)) {
    return { error: "Use a photo. It is saved as a small image." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: seal(raw) } });
  return { error: "" };
}

const BIO_LIMIT = 280;

export async function updateBioAction(formData: FormData): Promise<{ error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to update your profile." };
  if (!rateLimit(`bio:${user.id}`, 20, 15 * 60 * 1000)) return { error: "Too many updates. Try again in a few minutes." };
  const bio = cleanBio(String(formData.get("bio") || ""));
  if (bio.error) return { error: bio.error };
  await prisma.user.update({ where: { id: user.id }, data: { bio: bio.text ? seal(bio.text) : null } });
  return { error: "" };
}

function cleanBio(raw: string): { text: string | null; error: string } {
  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if ([...text].length > BIO_LIMIT) return { text: null, error: "Keep it to 280 characters." };
  return { text: text || null, error: "" };
}

export type PasswordState = { error: string; ok: string };

export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await getCurrentUser();
  if (!user?.passwordHash) return { error: "Sign in with a password to change it.", ok: "" };
  const passwordKey = `pw:${user.id}`;
  const current = String(formData.get("current") || "");
  const nextPassword = String(formData.get("nextPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");
  if (loginCooling(passwordKey) || !(await allowAttempt("password", user.email))) {
    await verifyPassword(current || "placeholder", user.passwordHash);
    return { error: LOGIN_FAILURE, ok: "" };
  }
  if (!(await verifyPassword(current, user.passwordHash))) {
    noteLoginFailure(passwordKey);
    return { error: LOGIN_FAILURE, ok: "" };
  }
  clearLoginFailure(passwordKey);
  if (nextPassword.length < 8 || nextPassword.length > 200) return { error: "Use a password of at least 8 characters.", ok: "" };
  if (nextPassword !== confirm) return { error: "Those passwords do not match.", ok: "" };
  if (nextPassword === current) return { error: "Choose a different password.", ok: "" };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(nextPassword) } });
  return { error: "", ok: "Password updated." };
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}
