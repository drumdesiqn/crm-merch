import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.production.local" });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.production.local");
  process.exit(1);
}

const sql = neon(dbUrl);

try {
  await sql`ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "homeAddress" TEXT`;
  console.log('✓ homeAddress column added (or already existed)');
} catch (err) {
  console.error("✗ Error:", err.message);
  process.exit(1);
}
