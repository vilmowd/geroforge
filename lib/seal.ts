import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { getEnv } from "@/lib/env";

const PREFIX = "v1.";

function key(): Buffer {
  const env = getEnv();
  const secret = env.dataKey || env.authSecret;
  return createHash("sha256").update(`geroforge-seal-v1:${secret}`).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function reveal(value: string | null | undefined): string {
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value;
  return openSecret(value) ?? "";
}

export function openSecret(value: string): string | null {
  try {
    const buf = Buffer.from(value.slice(PREFIX.length), "base64url");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function emailKey(email: string): string {
  return createHmac("sha256", key()).update(email.trim().toLowerCase()).digest("hex");
}

export function sealCursor(mix: string, offset: number): string {
  return seal(`${mix}:${offset}`);
}

export function openCursor(token: string): { mix: string; offset: number } | null {
  if (!token.startsWith(PREFIX)) return null;
  const plain = openSecret(token);
  if (!plain) return null;
  const split = plain.split(":");
  if (split.length !== 2 || !/^[a-z0-9]{6,16}$/i.test(split[0])) return null;
  const offset = Number(split[1]);
  if (!Number.isInteger(offset) || offset < 0 || offset > 10000) return null;
  return { mix: split[0], offset };
}

