-- Create Store table
CREATE TABLE IF NOT EXISTS "Store" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- Create unique index on storeId
CREATE UNIQUE INDEX IF NOT EXISTS "Store_storeId_key" ON "Store"("storeId");

-- Create indexes for common lookups
CREATE INDEX IF NOT EXISTS "Store_storeName_idx" ON "Store"("storeName");
CREATE INDEX IF NOT EXISTS "Store_storeCity_idx" ON "Store"("storeCity");
