export {};

async function main() {
  const { loadEnvFile } = await import("../lib/load-env");
  loadEnvFile();
  const { startScheduler } = await import("../lib/scheduler");
  startScheduler();
  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
