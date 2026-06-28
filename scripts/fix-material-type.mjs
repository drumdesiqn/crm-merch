import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  console.log('Fixing materialType column...');
  
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  
  try {
    // Drop the column if it exists
    await prisma.$executeRawUnsafe(`ALTER TABLE "Visit" DROP COLUMN IF EXISTS "materialType"`);
    console.log('✓ Dropped materialType column');
    
    // Add the column as TEXT
    await prisma.$executeRawUnsafe(`ALTER TABLE "Visit" ADD COLUMN "materialType" TEXT`);
    console.log('✓ Added materialType column as TEXT');
    
    console.log('✓ MaterialType column fixed successfully');
  } catch (error) {
    console.error('Error fixing materialType:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
