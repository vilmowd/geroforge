import { prisma } from "@/lib/prisma";

const SCRAPE_LOG_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export async function pruneOperationalLogs(): Promise<{ logs: number; links: number; sessions: number }> {
  const cutoff = new Date(Date.now() - SCRAPE_LOG_TTL_MS);
  const now = new Date();
  const [logs, links, sessions] = await Promise.all([
    prisma.scrapeLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.magicLink.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { lt: cutoff } }] } }),
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  return { logs: logs.count, links: links.count, sessions: sessions.count };
}
