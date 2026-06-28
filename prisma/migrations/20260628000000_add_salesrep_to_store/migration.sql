-- Add salesRep column to Store table
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "salesRep" TEXT;
