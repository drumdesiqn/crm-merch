import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.production.local", override: false });
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const email = process.env.NEW_USER_EMAIL?.trim();
const password = process.env.NEW_USER_PASSWORD ?? "";
const name = process.env.NEW_USER_NAME?.trim() || null;
const forceResetPassword = process.env.FORCE_RESET_PASSWORD === "true";

if (!email || !password) {
  console.error("Missing NEW_USER_EMAIL or NEW_USER_PASSWORD");
  process.exit(1);
}

if (password.length < 6) {
  console.error("Password must be at least 6 characters");
  process.exit(1);
}

const normalizedEmail = email.toLowerCase();

try {
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true },
  });

  if (existing) {
    if (forceResetPassword) {
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashedPassword, ...(name ? { name } : {}) },
      });
      console.log(`Password reset for existing user: ${existing.email} (${existing.id})`);
      process.exit(0);
    }

    console.log(`User already exists: ${existing.email} (${existing.id})`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  console.log("User created:", user);
} catch (error) {
  console.error("Failed to create user:", error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
