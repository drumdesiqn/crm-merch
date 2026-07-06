/**
 * Vercel build script — replaces the inline one-liner in package.json.
 * Steps: generate Prisma client, apply migrations (only on Vercel), generate icons, stamp SW, clean .next, build.
 */
import { execSync } from "child_process";
import { rmSync } from "fs";

const run = (cmd) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

run("prisma generate");

// Only run migrations on Vercel (when DATABASE_URL is available)
if (process.env.DATABASE_URL) {
  run("node scripts/apply-migrations.mjs");
} else {
  console.log("\n⚠ Skipping migrations (no DATABASE_URL - local build)");
}

run("node scripts/gen-icons.mjs");

run("npm run lint");
run("npm run test:run");

console.log("\n▶ Cleaning .next cache…");
rmSync(".next", { recursive: true, force: true });

run("next build");