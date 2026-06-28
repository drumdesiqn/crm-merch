-- Migration: Convert materialType from text to text[] to support multiple material types
-- This preserves existing data by wrapping single values in arrays

-- Step 1: Create a temporary column to hold the array data
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "materialType_new" TEXT[];

-- Step 2: Migrate existing data: convert non-null values to arrays
UPDATE "Visit" SET "materialType_new" = ARRAY["materialType"] WHERE "materialType" IS NOT NULL AND "materialType" != '';

-- Step 3: Set default empty array for null values
UPDATE "Visit" SET "materialType_new" = ARRAY[]::TEXT[] WHERE "materialType_new" IS NULL;

-- Step 4: Drop the old column
ALTER TABLE "Visit" DROP COLUMN IF EXISTS "materialType";

-- Step 5: Rename the new column to the original name
ALTER TABLE "Visit" RENAME COLUMN "materialType_new" TO "materialType";

-- Step 6: Set default value for new rows
ALTER TABLE "Visit" ALTER COLUMN "materialType" SET DEFAULT ARRAY[]::TEXT[];
