import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth-simple";
import { jwtVerify } from "jose";
import { checkRateLimit } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function PATCH(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateLimit = checkRateLimit(`password-change:${ip}`, 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie dans 1 heure." },
      { status: 429 }
    );
  }

  try {
    // Verify JWT from cookie
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    let payload: { userId: string; email: string };
    try {
      const { payload: p } = await jwtVerify(token, JWT_SECRET);
      payload = p as { userId: string; email: string };
    } catch {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères" }, { status: 400 });
    }

    const verify = await verifyPassword(payload.email, currentPassword);
    if (!verify.success) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "PATCH /api/auth/password");
  }
}
