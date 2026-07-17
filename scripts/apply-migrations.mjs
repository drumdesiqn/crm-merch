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
const strictMode = process.env.MIGRATIONS_STRICT !== "false";
if (!strictMode) {
  console.warn("⚠ MIGRATIONS_STRICT=false: statement failures will not abort the full script.");
}

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
    sql: [
      `CREATE TABLE IF NOT EXISTS "VisitNote" (
        "id" TEXT NOT NULL,
        "visitId" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VisitNote_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "VisitPhoto" (
        "id" TEXT NOT NULL,
        "visitId" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "blobKey" TEXT NOT NULL,
        "caption" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VisitPhoto_pkey" PRIMARY KEY ("id")
      )`,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'VisitNote_visitId_fkey'
        ) THEN
          ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_visitId_fkey"
            FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'VisitPhoto_visitId_fkey'
        ) THEN
          ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_visitId_fkey"
            FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
    ],
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
    sql: [
      `CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "name" TEXT,
        "email" TEXT NOT NULL,
        "emailVerified" TIMESTAMP(3),
        "password" TEXT NOT NULL,
        "image" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
      `CREATE TABLE IF NOT EXISTS "Account" (
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
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`,
      `CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL,
        "sessionToken" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "expires" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken")`,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'Account_userId_fkey'
        ) THEN
          ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'Session_userId_fkey'
        ) THEN
          ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
    ],
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
    name: "20260705000000_add_contacts",
    sql: [
      `CREATE TABLE IF NOT EXISTS "ContactTeam" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "color" TEXT NOT NULL DEFAULT 'bg-slate-50 border-slate-200 text-slate-700',
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ContactTeam_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ContactTeam_name_key" ON "ContactTeam"("name")`,
      `CREATE TABLE IF NOT EXISTS "Contact" (
        "id" TEXT NOT NULL,
        "teamId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "Contact_teamId_idx" ON "Contact"("teamId")`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contact_teamId_fkey') THEN
          ALTER TABLE "Contact" ADD CONSTRAINT "Contact_teamId_fkey"
            FOREIGN KEY ("teamId") REFERENCES "ContactTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
      `INSERT INTO "ContactTeam" ("id", "name", "color", "sortOrder", "updatedAt") VALUES
        ('team_snacking', 'Mars Snacking', 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400', 1, CURRENT_TIMESTAMP),
        ('team_food_pet', 'Mars Food & Pet Nutrition', 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400', 2, CURRENT_TIMESTAMP),
        ('team_spt', 'Mars SPT', 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400', 3, CURRENT_TIMESTAMP)
        ON CONFLICT ("name") DO NOTHING`,
      `INSERT INTO "Contact" ("id", "teamId", "name", "phone", "email", "sortOrder", "updatedAt") VALUES
        ('c_snk_01', 'team_snacking', 'Ann-Sophie Noppe', '+32 472 07 15 63', 'annsophie.noppe@effem.com', 1, CURRENT_TIMESTAMP),
        ('c_snk_02', 'team_snacking', 'Anne-Sophie Roose', '+32 497 51 57 15', 'anne-sophie.roose@effem.com', 2, CURRENT_TIMESTAMP),
        ('c_snk_03', 'team_snacking', 'Annelies Heerwegh', '+32 470 38 21 78', 'annelies.heerwegh@effem.com', 3, CURRENT_TIMESTAMP),
        ('c_snk_04', 'team_snacking', 'Didier Brynaert', '+32 499 58 59 40', 'didier.brynaert@effem.com', 4, CURRENT_TIMESTAMP),
        ('c_snk_05', 'team_snacking', 'Jean-Jacques Bartholoméi', '+32 493 31 59 07', 'jeanjacques.bartholomei@effem.com', 5, CURRENT_TIMESTAMP),
        ('c_snk_06', 'team_snacking', 'Jordy Moonen', '+32 478 18 96 17', 'jordy.moonen@effem.com', 6, CURRENT_TIMESTAMP),
        ('c_snk_07', 'team_snacking', 'Kristof Lowartz', '+32 491 90 98 24', 'kristof.lowartz@effem.com', 7, CURRENT_TIMESTAMP),
        ('c_snk_08', 'team_snacking', 'Maxim Philippe', '+32 496 40 33 75', 'maxim.philippe@effem.com', 8, CURRENT_TIMESTAMP),
        ('c_snk_09', 'team_snacking', 'Olivier Bex', '+32 493 09 65 65', 'olivier.bex@effem.com', 9, CURRENT_TIMESTAMP),
        ('c_snk_10', 'team_snacking', 'Souliman Bensellam', '+32 492 73 03 67', 'souliman.bensellam@effem.com', 10, CURRENT_TIMESTAMP),
        ('c_snk_11', 'team_snacking', 'Yassine Boulif', '+32 499 58 59 36', 'yassine.boulit@effem.com', 11, CURRENT_TIMESTAMP),
        ('c_fp_01', 'team_food_pet', 'An Vangerven', '+32 476 50 78 71', 'an.vangerven@effem.com', 1, CURRENT_TIMESTAMP),
        ('c_fp_02', 'team_food_pet', 'Benjamin Francq', '+32 499 58 59 38', 'benjamin.francq@effem.com', 2, CURRENT_TIMESTAMP),
        ('c_fp_03', 'team_food_pet', 'Fabrizio Antonini', '+32 493 09 65 46', 'fabrizio.antonini@effem.com', 3, CURRENT_TIMESTAMP),
        ('c_fp_04', 'team_food_pet', 'Marie-Ysaline Minet', '+32 474 70 95 13', 'marieysaline.minet@effem.com', 4, CURRENT_TIMESTAMP),
        ('c_fp_05', 'team_food_pet', 'Pierre Grotz', '+32 476 55 77 46', 'pierre.grotz@effem.com', 5, CURRENT_TIMESTAMP),
        ('c_fp_06', 'team_food_pet', 'Sofie Kina', '+32 497 51 60 55', 'sofie.kina@effem.com', 6, CURRENT_TIMESTAMP),
        ('c_spt_01', 'team_spt', 'Arnaud Van Pellecom', '+32 493 97 70 88', 'arnaud.van.pellecom@effem.com', 1, CURRENT_TIMESTAMP),
        ('c_spt_02', 'team_spt', 'Dominique Colot', '+32 495 59 65 37', 'dominique.colot@effem.com', 2, CURRENT_TIMESTAMP),
        ('c_spt_03', 'team_spt', 'Stijn Dhooge', '+32 496 59 12 53', 'stijn.dhooge@effem.com', 3, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING`,
    ],
  },
  {
    name: "20260705020000_add_modification_visit_id",
    sql: [
      `ALTER TABLE "Modification" ADD COLUMN IF NOT EXISTS "visitId" TEXT`,
      `CREATE INDEX IF NOT EXISTS "Modification_visitId_idx" ON "Modification"("visitId")`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Modification_visitId_fkey') THEN
          ALTER TABLE "Modification" ADD CONSTRAINT "Modification_visitId_fkey"
            FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,
    ],
  },
  {
    name: "20260707000000_add_excel_url_to_week",
    sql: [
      `ALTER TABLE "Week" ADD COLUMN IF NOT EXISTS "excelUrl" TEXT;`,
    ],
  },
  {
    name: "20260707100000_add_starred_to_visit_photo",
    sql: [
      `ALTER TABLE "VisitPhoto" ADD COLUMN IF NOT EXISTS "starred" BOOLEAN NOT NULL DEFAULT false;`,
      `CREATE INDEX IF NOT EXISTS "VisitPhoto_starred_idx" ON "VisitPhoto"("starred");`,
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
  {
    name: "20260717000000_add_user_scope_core_models",
    sql: [
      `ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
      `ALTER TABLE "Week" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
      `ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
      `ALTER TABLE "VisitNote" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
      `ALTER TABLE "VisitPhoto" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
      `ALTER TABLE "GlossaryTerm" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
      `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
      `ALTER TABLE "ContactTeam" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
      `ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,

      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Store_userId_fkey') THEN
          ALTER TABLE "Store" ADD CONSTRAINT "Store_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Week_userId_fkey') THEN
          ALTER TABLE "Week" ADD CONSTRAINT "Week_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Visit_userId_fkey') THEN
          ALTER TABLE "Visit" ADD CONSTRAINT "Visit_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VisitNote_userId_fkey') THEN
          ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VisitPhoto_userId_fkey') THEN
          ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GlossaryTerm_userId_fkey') THEN
          ALTER TABLE "GlossaryTerm" ADD CONSTRAINT "GlossaryTerm_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Settings_userId_fkey') THEN
          ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContactTeam_userId_fkey') THEN
          ALTER TABLE "ContactTeam" ADD CONSTRAINT "ContactTeam_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contact_userId_fkey') THEN
          ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,

      `CREATE INDEX IF NOT EXISTS "Store_userId_idx" ON "Store"("userId");`,
      `CREATE INDEX IF NOT EXISTS "Week_userId_idx" ON "Week"("userId");`,
      `CREATE INDEX IF NOT EXISTS "Visit_userId_idx" ON "Visit"("userId");`,
      `CREATE INDEX IF NOT EXISTS "VisitNote_userId_idx" ON "VisitNote"("userId");`,
      `CREATE INDEX IF NOT EXISTS "VisitPhoto_userId_idx" ON "VisitPhoto"("userId");`,
      `CREATE INDEX IF NOT EXISTS "GlossaryTerm_userId_idx" ON "GlossaryTerm"("userId");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Settings_userId_key" ON "Settings"("userId");`,
      `CREATE INDEX IF NOT EXISTS "ContactTeam_userId_idx" ON "ContactTeam"("userId");`,
      `CREATE INDEX IF NOT EXISTS "Contact_userId_idx" ON "Contact"("userId");`,

      `UPDATE "Store" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;`,
      `UPDATE "Week" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;`,
      `UPDATE "Visit" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;`,
      `UPDATE "VisitNote" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;`,
      `UPDATE "VisitPhoto" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;`,
      `UPDATE "GlossaryTerm" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;`,
      `UPDATE "Settings" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;`,
      `UPDATE "ContactTeam" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;`,
      `UPDATE "Contact" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;`,
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
      if (strictMode) {
        throw new Error(`Migration failed in strict mode (${migration.name}): ${err.message}`);
      }
    }
  }
  if (success) {
    await sql.query(`INSERT INTO "_MigrationLog" ("name") VALUES ('${migration.name.replace(/'/g, "''")}') ON CONFLICT DO NOTHING`);
    console.log(`✓ Migration ${migration.name} recorded`);
  }
}