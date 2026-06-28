import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new (PrismaNeon as any)({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

if (!globalForPrisma.prisma && process.env.DATABASE_URL) {
  globalForPrisma.prisma = createPrismaClient();
}

export const prisma = globalForPrisma.prisma!;
