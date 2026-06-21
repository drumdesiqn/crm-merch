import { neon } from "@neondatabase/serverless";

const dbUrl = process.argv[2];
if (!dbUrl) {
  console.error("Usage: node scripts/run-sql.mjs <DATABASE_URL>");
  process.exit(1);
}

const sql = neon(dbUrl);

const queries = [
  `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "homeAddress" TEXT`,
];

for (const query of queries) {
  try {
    await sql(query);
    console.log("✓ Done:", query.substring(0, 60));
  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}
