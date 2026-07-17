import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUser } from "@/lib/auth-simple";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) {
      return NextResponse.json({ error: "Un utilisateur avec cet email existe déjà" }, { status: 409 });
    }

    const user = await createUser(email, password, name || undefined);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la création utilisateur" }, { status: 500 });
  }
}
