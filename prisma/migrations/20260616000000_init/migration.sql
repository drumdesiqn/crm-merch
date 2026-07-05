-- Full idempotent schema init
CREATE TABLE IF NOT EXISTS "Week" (
    "id" TEXT NOT NULL,
    "weekNum" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Visit" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "assortment" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeAddress" TEXT NOT NULL,
    "storeZipcode" TEXT NOT NULL,
    "storeCity" TEXT NOT NULL,
    "visitType" TEXT NOT NULL,
    "visitFrequence" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "merchandiser" TEXT,
    "remarks" TEXT,
    "salesRep" TEXT,
    "materials" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MailLog" (
    "id" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "summary" TEXT,
    "replyDraft" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MailLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Modification" (
    "id" TEXT NOT NULL,
    "mailLogId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Modification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GlossaryTerm" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "openaiKey" TEXT,
    "userName" TEXT,
    "userZone" TEXT,
    "userEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

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

-- Indexes (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "Week_weekNum_year_key" ON "Week"("weekNum", "year");
CREATE UNIQUE INDEX IF NOT EXISTS "GlossaryTerm_term_key" ON "GlossaryTerm"("term");

-- Foreign keys (idempotent via DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Visit_weekId_fkey') THEN
    ALTER TABLE "Visit" ADD CONSTRAINT "Visit_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Modification_mailLogId_fkey') THEN
    ALTER TABLE "Modification" ADD CONSTRAINT "Modification_mailLogId_fkey" FOREIGN KEY ("mailLogId") REFERENCES "MailLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VisitNote_visitId_fkey') THEN
    ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VisitPhoto_visitId_fkey') THEN
    ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MaterialGuide" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "photoUrl" TEXT,
    "blobKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialGuide_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MaterialGuide_name_key" ON "MaterialGuide"("name");

-- Extra columns added after init (idempotent)
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "materialType" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "homeAddress" TEXT;

-- ContactTeam and Contact tables
CREATE TABLE IF NOT EXISTS "ContactTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'bg-slate-50 border-slate-200 text-slate-700',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactTeam_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContactTeam_name_key" ON "ContactTeam"("name");

CREATE TABLE IF NOT EXISTS "Contact" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Contact_teamId_idx" ON "Contact"("teamId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contact_teamId_fkey') THEN
    ALTER TABLE "Contact" ADD CONSTRAINT "Contact_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "ContactTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Seed default teams and contacts (idempotent)
INSERT INTO "ContactTeam" ("id", "name", "color", "sortOrder", "updatedAt")
VALUES
  ('team_snacking', 'Mars Snacking', 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400', 1, CURRENT_TIMESTAMP),
  ('team_food_pet', 'Mars Food & Pet Nutrition', 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400', 2, CURRENT_TIMESTAMP),
  ('team_spt', 'Mars SPT', 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400', 3, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Contact" ("id", "teamId", "name", "phone", "email", "sortOrder", "updatedAt")
VALUES
  ('c_snk_01', 'team_snacking', 'Ann-Sophie Noppe',         '+32 472 07 15 63', 'annsophie.noppe@effem.com',      1, CURRENT_TIMESTAMP),
  ('c_snk_02', 'team_snacking', 'Anne-Sophie Roose',        '+32 497 51 57 15', 'anne-sophie.roose@effem.com',    2, CURRENT_TIMESTAMP),
  ('c_snk_03', 'team_snacking', 'Annelies Heerwegh',        '+32 470 38 21 78', 'annelies.heerwegh@effem.com',    3, CURRENT_TIMESTAMP),
  ('c_snk_04', 'team_snacking', 'Didier Brynaert',          '+32 499 58 59 40', 'didier.brynaert@effem.com',      4, CURRENT_TIMESTAMP),
  ('c_snk_05', 'team_snacking', 'Jean-Jacques Bartholoméi', '+32 493 31 59 07', 'jeanjacques.bartholomei@effem.com', 5, CURRENT_TIMESTAMP),
  ('c_snk_06', 'team_snacking', 'Jordy Moonen',             '+32 478 18 96 17', 'jordy.moonen@effem.com',         6, CURRENT_TIMESTAMP),
  ('c_snk_07', 'team_snacking', 'Kristof Lowartz',          '+32 491 90 98 24', 'kristof.lowartz@effem.com',      7, CURRENT_TIMESTAMP),
  ('c_snk_08', 'team_snacking', 'Maxim Philippe',           '+32 496 40 33 75', 'maxim.philippe@effem.com',       8, CURRENT_TIMESTAMP),
  ('c_snk_09', 'team_snacking', 'Olivier Bex',              '+32 493 09 65 65', 'olivier.bex@effem.com',          9, CURRENT_TIMESTAMP),
  ('c_snk_10', 'team_snacking', 'Souliman Bensellam',       '+32 492 73 03 67', 'souliman.bensellam@effem.com',   10, CURRENT_TIMESTAMP),
  ('c_snk_11', 'team_snacking', 'Yassine Boulif',           '+32 499 58 59 36', 'yassine.boulit@effem.com',       11, CURRENT_TIMESTAMP),
  ('c_fp_01',  'team_food_pet', 'An Vangerven',              '+32 476 50 78 71', 'an.vangerven@effem.com',         1, CURRENT_TIMESTAMP),
  ('c_fp_02',  'team_food_pet', 'Benjamin Francq',           '+32 499 58 59 38', 'benjamin.francq@effem.com',     2, CURRENT_TIMESTAMP),
  ('c_fp_03',  'team_food_pet', 'Fabrizio Antonini',         '+32 493 09 65 46', 'fabrizio.antonini@effem.com',   3, CURRENT_TIMESTAMP),
  ('c_fp_04',  'team_food_pet', 'Marie-Ysaline Minet',       '+32 474 70 95 13', 'marieysaline.minet@effem.com',  4, CURRENT_TIMESTAMP),
  ('c_fp_05',  'team_food_pet', 'Pierre Grotz',              '+32 476 55 77 46', 'pierre.grotz@effem.com',        5, CURRENT_TIMESTAMP),
  ('c_fp_06',  'team_food_pet', 'Sofie Kina',                '+32 497 51 60 55', 'sofie.kina@effem.com',          6, CURRENT_TIMESTAMP),
  ('c_spt_01', 'team_spt',      'Arnaud Van Pellecom',       '+32 493 97 70 88', 'arnaud.van.pellecom@effem.com', 1, CURRENT_TIMESTAMP),
  ('c_spt_02', 'team_spt',      'Dominique Colot',           '+32 495 59 65 37', 'dominique.colot@effem.com',     2, CURRENT_TIMESTAMP),
  ('c_spt_03', 'team_spt',      'Stijn Dhooge',              '+32 496 59 12 53', 'stijn.dhooge@effem.com',        3, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
