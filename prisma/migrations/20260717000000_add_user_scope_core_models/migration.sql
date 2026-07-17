-- Add userId ownership columns
ALTER TABLE "Store" ADD COLUMN "userId" TEXT;
ALTER TABLE "Week" ADD COLUMN "userId" TEXT;
ALTER TABLE "Visit" ADD COLUMN "userId" TEXT;
ALTER TABLE "VisitNote" ADD COLUMN "userId" TEXT;
ALTER TABLE "VisitPhoto" ADD COLUMN "userId" TEXT;
ALTER TABLE "GlossaryTerm" ADD COLUMN "userId" TEXT;
ALTER TABLE "Settings" ADD COLUMN "userId" TEXT;
ALTER TABLE "ContactTeam" ADD COLUMN "userId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "userId" TEXT;

-- Foreign keys to User
ALTER TABLE "Store" ADD CONSTRAINT "Store_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Week" ADD CONSTRAINT "Week_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GlossaryTerm" ADD CONSTRAINT "GlossaryTerm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContactTeam" ADD CONSTRAINT "ContactTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Store_userId_idx" ON "Store"("userId");
CREATE INDEX "Week_userId_idx" ON "Week"("userId");
CREATE INDEX "Visit_userId_idx" ON "Visit"("userId");
CREATE INDEX "VisitNote_userId_idx" ON "VisitNote"("userId");
CREATE INDEX "VisitPhoto_userId_idx" ON "VisitPhoto"("userId");
CREATE INDEX "GlossaryTerm_userId_idx" ON "GlossaryTerm"("userId");
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");
CREATE INDEX "ContactTeam_userId_idx" ON "ContactTeam"("userId");
CREATE INDEX "Contact_userId_idx" ON "Contact"("userId");

-- Backfill: attach existing rows to the first existing user (if any)
WITH first_user AS (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
)
UPDATE "Store" SET "userId" = (SELECT "id" FROM first_user) WHERE "userId" IS NULL;

WITH first_user AS (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
)
UPDATE "Week" SET "userId" = (SELECT "id" FROM first_user) WHERE "userId" IS NULL;

WITH first_user AS (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
)
UPDATE "Visit" SET "userId" = (SELECT "id" FROM first_user) WHERE "userId" IS NULL;

WITH first_user AS (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
)
UPDATE "VisitNote" SET "userId" = (SELECT "id" FROM first_user) WHERE "userId" IS NULL;

WITH first_user AS (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
)
UPDATE "VisitPhoto" SET "userId" = (SELECT "id" FROM first_user) WHERE "userId" IS NULL;

WITH first_user AS (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
)
UPDATE "GlossaryTerm" SET "userId" = (SELECT "id" FROM first_user) WHERE "userId" IS NULL;

WITH first_user AS (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
)
UPDATE "Settings" SET "userId" = (SELECT "id" FROM first_user) WHERE "userId" IS NULL;

WITH first_user AS (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
)
UPDATE "ContactTeam" SET "userId" = (SELECT "id" FROM first_user) WHERE "userId" IS NULL;

WITH first_user AS (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
)
UPDATE "Contact" SET "userId" = (SELECT "id" FROM first_user) WHERE "userId" IS NULL;
