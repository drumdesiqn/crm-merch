import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function verifyPassword(email: string, password: string): Promise<{ success: boolean; user?: { id: string; email: string; name: string | null } }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, password: true },
    });

    if (!user || !user.password) {
      return { success: false };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false };
    }

    return { success: true, user: { id: user.id, email: user.email, name: user.name } };
  } catch {
    return { success: false };
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await hashPassword(password);
  const normalizedEmail = email.trim().toLowerCase();
  return await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name,
    },
  });
}
