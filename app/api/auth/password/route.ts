import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth-simple";
import { checkRateLimit } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/api-utils";
import { getClientIp } from "@/lib/request-ip";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`password-change:${ip}`, 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie dans 1 heure." },
      { status: 429 }
    );
  }

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères" }, { status: 400 });
    }

    const verify = await verifyPassword(auth.user.email, currentPassword);
    if (!verify.success) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: auth.user.userId },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "PATCH /api/auth/password");
  }
}