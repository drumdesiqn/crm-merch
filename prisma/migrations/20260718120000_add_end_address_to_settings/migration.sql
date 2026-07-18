-- Add optional routing destination address per user
ALTER TABLE "Settings"
ADD COLUMN IF NOT EXISTS "endAddress" TEXT;
