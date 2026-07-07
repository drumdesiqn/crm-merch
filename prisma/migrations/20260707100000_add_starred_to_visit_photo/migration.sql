-- AlterTable
ALTER TABLE "VisitPhoto" ADD COLUMN "starred" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "VisitPhoto_starred_idx" ON "VisitPhoto"("starred");
