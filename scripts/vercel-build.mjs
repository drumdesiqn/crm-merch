/**
 * Vercel build script — replaces the inline one-liner in package.json.
 * Steps: generate Prisma client, apply migrations, generate icons, stamp SW, clean .next, build.
 */
import { execSync } from "child_process";
import { rmSync } from "fs";

const run = (cmd) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

run("prisma generate");
run("node scripts/apply-migrations.mjs");
run("node scripts/gen-icons.mjs");
run("node scripts/stamp-sw.mjs");

console.log("\n▶ Cleaning .next cache…");
rmSync(".next", { recursive: true, force: true });

run("next build");
