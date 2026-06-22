-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Account";

-- DropTable
DROP TABLE IF EXISTS "Session";
