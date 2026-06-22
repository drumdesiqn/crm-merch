import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@marsmerch.com";
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!password || password.length < 8) {
    console.error("❌ ADMIN_PASSWORD env var is required and must be at least 8 characters.");
    console.error("   Usage: ADMIN_PASSWORD=yourSecurePass node scripts/create-admin.mjs");
    process.exit(1);
  }

  console.log("Creating admin user...");
  console.log(`Email: ${email}`);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log("✅ Admin user already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  console.log("✅ Admin user created successfully");
  console.log(`   Email: ${email}`);
  console.log("\n⚠️  IMPORTANT: Change the password after first login!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
