/**
 * Stamps public/sw.js with a fresh CACHE_VERSION based on the current timestamp.
 * Run as part of the build pipeline so the service worker cache busts automatically.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const swPath = resolve(__dirname, "../public/sw.js");

const version = `v${new Date().toISOString().slice(0, 16).replace(/[-T:]/g, ".")}`;
const content = readFileSync(swPath, "utf-8");
const updated = content.replace(
  /const CACHE_VERSION = "[^"]+"/,
  `const CACHE_VERSION = "${version}"`
);

writeFileSync(swPath, updated, "utf-8");
console.log(`[stamp-sw] CACHE_VERSION → ${version}`);
