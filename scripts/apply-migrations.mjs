// Run pending migrations using @neondatabase/serverless (HTTP mode — works from Vercel build)
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// Create migration tracking table if not exists
await sql.query(`
  CREATE TABLE IF NOT EXISTS "_MigrationLog" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "appliedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  );
`);

// Mark destructive migration as already applied to prevent data loss on re-run
await sql.query(`
  INSERT INTO "_MigrationLog" ("name") VALUES ('20260624000000_material_type_text') ON CONFLICT DO NOTHING
`);

// Get already-applied migrations
const applied = await sql.query(`SELECT "name" FROM "_MigrationLog"`);
// sql.query returns an array of rows directly
const appliedRows = Array.isArray(applied) ? applied : (applied.rows ?? []);
const appliedSet = new Set(appliedRows.map((r) => r.name));
console.log(`Already applied: ${appliedSet.size} migrations`);

const migrations = [
  {
    name: "20260616000000_init",
    sql: null, // already applied
  },
  {
    name: "20260616120000_add_sort_order",
    sql: `ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;`,
  },
  {
    name: "20260616180000_add_visit_notes_photos",
    sql: `
      CREATE TABLE IF NOT EXISTS "VisitNote" (
        "id" TEXT NOT NULL,
        "visitId" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VisitNote_pkey" PRIMARY KEY ("id")
      );
      CREATE TABLE IF NOT EXISTS "VisitPhoto" (
        "id" TEXT NOT NULL,
        "visitId" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "blobKey" TEXT NOT NULL,
        "caption" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VisitPhoto_pkey" PRIMARY KEY ("id")
      );
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'VisitNote_visitId_fkey'
        ) THEN
          ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_visitId_fkey"
            FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'VisitPhoto_visitId_fkey'
        ) THEN
          ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_visitId_fkey"
            FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `,
  },
  {
    name: "20260616190000_add_home_address",
    sql: `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "homeAddress" TEXT;`,
  },
  {
    name: "20260621100000_add_store_id_to_notes_photos",
    sql: [
      `ALTER TABLE "VisitNote" ADD COLUMN IF NOT EXISTS "storeId" TEXT;`,
      `ALTER TABLE "VisitPhoto" ADD COLUMN IF NOT EXISTS "storeId" TEXT;`,
      `CREATE INDEX IF NOT EXISTS "VisitNote_storeId_idx" ON "VisitNote"("storeId");`,
      `CREATE INDEX IF NOT EXISTS "VisitPhoto_storeId_idx" ON "VisitPhoto"("storeId");`,
    ],
  },
  {
    name: "20260621000000_add_auth",
    sql: `
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "name" TEXT,
        "email" TEXT NOT NULL,
        "emailVerified" TIMESTAMP(3),
        "password" TEXT NOT NULL,
        "image" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

      CREATE TABLE IF NOT EXISTS "Account" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "refresh_token" TEXT,
        "access_token" TEXT,
        "expires_at" INTEGER,
        "token_type" TEXT,
        "scope" TEXT,
        "id_token" TEXT,
        "session_state" TEXT,
        CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL,
        "sessionToken" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "expires" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'Account_userId_fkey'
        ) THEN
          ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'Session_userId_fkey'
        ) THEN
          ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `,
  },
  {
    name: "20260622000000_drop_unused_auth_tables",
    sql: [
      `ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_userId_fkey"`,
      `ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey"`,
      `DROP TABLE IF EXISTS "Account"`,
      `DROP TABLE IF EXISTS "Session"`,
    ],
  },
  {
    name: "20260622200000_add_performance_indexes",
    sql: [
      `CREATE INDEX IF NOT EXISTS "Visit_storeId_idx" ON "Visit"("storeId");`,
      `CREATE INDEX IF NOT EXISTS "Visit_weekId_idx" ON "Visit"("weekId");`,
      `CREATE INDEX IF NOT EXISTS "Visit_visitDate_idx" ON "Visit"("visitDate");`,
      `CREATE INDEX IF NOT EXISTS "VisitNote_visitId_idx" ON "VisitNote"("visitId");`,
      `CREATE INDEX IF NOT EXISTS "VisitPhoto_visitId_idx" ON "VisitPhoto"("visitId");`,
    ],
  },
  {
    name: "20260623000000_add_geocoding_cache",
    sql: [
      `ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "latitude" FLOAT8;`,
      `ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "longitude" FLOAT8;`,
      `CREATE INDEX IF NOT EXISTS "Visit_weekId_visitDate_idx" ON "Visit"("weekId", "visitDate");`,
    ],
  },
  {
    name: "20260624000000_material_type_text",
    sql: [
      // Step 1: Drop if exists (any type)
      `ALTER TABLE "Visit" DROP COLUMN IF EXISTS "materialType";`,
      // Step 2: Add as TEXT
      `ALTER TABLE "Visit" ADD COLUMN "materialType" TEXT;`,
    ],
  },
  {
    name: "20260625000000_ensure_geocoding_and_material",
    sql: [
      // Ensure lat/lng exist (in case previous migration was skipped)
      `ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "latitude" FLOAT8;`,
      `ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "longitude" FLOAT8;`,
    ],
  },
  {
    name: "20260628000000_add_salesrep_to_store",
    sql: [
      `ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "salesRep" TEXT;`,
    ],
  },
  {
    name: "20260627000000_add_store_model",
    sql: [
      `CREATE TABLE IF NOT EXISTS "Store" (
        "id" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "storeName" TEXT NOT NULL,
        "storeAddress" TEXT NOT NULL,
        "storeZipcode" TEXT NOT NULL,
        "storeCity" TEXT NOT NULL,
        "assortment" TEXT NOT NULL DEFAULT '',
        "visitType" TEXT NOT NULL DEFAULT 'Maintenance',
        "visitFrequence" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Store_storeId_key" ON "Store"("storeId");`,
      `CREATE INDEX IF NOT EXISTS "Store_storeName_idx" ON "Store"("storeName");`,
      `CREATE INDEX IF NOT EXISTS "Store_storeCity_idx" ON "Store"("storeCity");`,
    ],
  },
];

for (const migration of migrations) {
  if (!migration.sql) continue;
  // Skip already-applied migrations
  if (appliedSet.has(migration.name)) {
    console.log(`⏭ Skipping already applied: ${migration.name}`);
    continue;
  }
  console.log(`\n▶ Applying migration: ${migration.name}`);
  const statements = Array.isArray(migration.sql) ? migration.sql : [migration.sql];
  let success = true;
  for (const statement of statements) {
    try {
      console.log(`  Executing: ${statement.substring(0, 100)}...`);
      await sql.query(statement);
      console.log(`  ✓ Statement executed`);
    } catch (err) {
      console.warn(`  ⚠ Statement failed: ${err.message}`);
      success = false;
    }
  }
  if (success) {
    await sql.query(`INSERT INTO "_MigrationLog" ("name") VALUES ('${migration.name.replace(/'/g, "''")}') ON CONFLICT DO NOTHING`);
    console.log(`✓ Migration ${migration.name} recorded`);
  }
}
