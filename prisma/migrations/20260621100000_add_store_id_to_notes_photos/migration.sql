-- Add storeId to notes and photos to link them to a store across visits

ALTER TABLE "VisitNote" ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE "VisitPhoto" ADD COLUMN IF NOT EXISTS "storeId" TEXT;

-- Create indexes for store-based lookups
CREATE INDEX IF NOT EXISTS "VisitNote_storeId_idx" ON "VisitNote"("storeId");
CREATE INDEX IF NOT EXISTS "VisitPhoto_storeId_idx" ON "VisitPhoto"("storeId");
