import { existsSync } from "fs";
import { resolve } from "path";
import EmbeddedPostgres from "embedded-postgres";

const databaseDir = resolve(process.cwd(), ".pgdata");
const port = Number(process.env.PGPORT || 5432);
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "forge",
  password: "forge",
  port,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (!existsSync(resolve(databaseDir, "PG_VERSION"))) {
  await pg.initialise();
}

await pg.start();

try {
  await pg.createDatabase("forge");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/already exists/i.test(message)) throw error;
}

console.log(`postgres ready on 127.0.0.1:${port} database forge`);
await new Promise(() => {});
