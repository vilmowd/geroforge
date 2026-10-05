import { safeNextPath } from "../lib/format";
import { LOGIN_FAILURE, clearLoginFailure, cooldownForFailures, loginCooling, noteLoginFailure } from "../lib/login-guard";
import { clientIp } from "../lib/client-ip";
import { isAllowedEmbedUrl } from "../lib/embed";
import { IngestError } from "../lib/errors";
import { assertPublicHttpUrl } from "../lib/url-safety";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function blocks(input: string) {
  try {
    await assertPublicHttpUrl(input);
    return false;
  } catch (error) {
    return error instanceof IngestError;
  }
}

async function main() {
const blocked = [
  "http://127.0.0.1/secret",
  "http://169.254.169.254/latest/meta-data",
  "http://localhost/admin",
  "http://10.1.2.3/",
  "http://192.168.1.20/",
  "http://user:pass@example.com/watch",
  "javascript:alert(1)",
  "file:///etc/passwd",
  "http://example.com:22/",
];

for (const input of blocked) {
  assert(await blocks(input), `expected block for ${input}`);
}

assert(clientIp(new Headers({ "x-forwarded-for": "203.0.113.8, 10.0.0.1" })) === "203.0.113.8", "client ip");
assert(clientIp(new Headers({ "x-forwarded-for": "not an ip" })) === null, "reject spoofed label");
assert(safeNextPath("https://evil.example") === "/", "external next path");
assert(safeNextPath("//evil.example") === "/", "protocol-relative next path");
assert(safeNextPath("/%2f%2fevil.example") === "/", "encoded slash next path");
assert(safeNextPath("/\\evil.example") === "/", "backslash next path");
assert(safeNextPath("/posts/example") === "/posts/example", "same-site next path");
assert(isAllowedEmbedUrl("javascript:alert(1)") === false, "javascript embed");
assert(isAllowedEmbedUrl("https://evil.example/embed/abcdefghijk") === false, "unknown embed host");
assert(!/password|reset|inbox|exists|email/i.test(LOGIN_FAILURE), "generic login failure");
const guardKey = "test:cooldown";
clearLoginFailure(guardKey);
assert(loginCooling(guardKey) === false, "fresh login is open");
noteLoginFailure(guardKey);
assert(loginCooling(guardKey) === true, "failed login cools down");
assert(cooldownForFailures(1) < cooldownForFailures(4), "cooldown grows");
assert(cooldownForFailures(9) === cooldownForFailures(6), "cooldown stays capped");
clearLoginFailure(guardKey);
assert(loginCooling(guardKey) === false, "successful login clears cooldown");

const previousNodeEnv = process.env.NODE_ENV;
const previousCron = process.env.CRON_SECRET;
setNodeEnv("production");
process.env.CRON_SECRET = "";
const { GET } = await import("../app/api/cron/route");
const open = await GET(new Request("http://localhost/api/cron"));
assert(open.status === 401, `unsigned cron in production returned ${open.status}`);
process.env.CRON_SECRET = "cron-check-secret-value-32b";
const wrong = await GET(
  new Request("http://localhost/api/cron", { headers: { authorization: "Bearer not-the-secret" } }),
);
assert(wrong.status === 401, `wrong cron secret returned ${wrong.status}`);
setNodeEnv(previousNodeEnv);
if (previousCron === undefined) delete process.env.CRON_SECRET;
else process.env.CRON_SECRET = previousCron;

console.log("security checks passed");
}

function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
