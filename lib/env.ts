export function getEnv() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const nodeEnv = process.env.NODE_ENV || "development";
  const authSecret = process.env.AUTH_SECRET || "";
  const cronSecret = process.env.CRON_SECRET || "";
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const dataKey = process.env.DATA_KEY || "";
  if (nodeEnv === "production") {
    requireProductionSecret("AUTH_SECRET", authSecret);
    requireProductionSecret("CRON_SECRET", cronSecret);
    requireProductionSecret("DATA_KEY", dataKey);
    if (!appUrl.startsWith("https://")) {
      throw new Error("APP_URL must use https in production");
    }
  }

  return {
    databaseUrl,
    authSecret: authSecret || "dev-only-insecure-secret",
    dataKey,
    appUrl,
    resendApiKey: process.env.RESEND_API_KEY || "",
    emailFrom: process.env.EMAIL_FROM || "GeroForge <onboarding@resend.dev>",
    enableWorker: process.env.ENABLE_WORKER !== "false",
    scrapeOnBoot: process.env.SCRAPE_ON_BOOT !== "false",
    cronSchedule: process.env.CRON_SCHEDULE || "0 */12 * * *",
    nodeEnv,
  };
}

function requireProductionSecret(name: string, value: string) {
  if (value.length < 24 || /replace-with|change-me|dev-only|example/i.test(value)) {
    throw new Error(`${name} must be a long random string in production`);
  }
}
