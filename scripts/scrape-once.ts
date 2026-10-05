export {};

async function main() {
  const { loadEnvFile } = await import("../lib/load-env");
  loadEnvFile();
  const { runIngestionCycle } = await import("../lib/scraper");
  const { prisma } = await import("../lib/prisma");
  await runIngestionCycle();
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
