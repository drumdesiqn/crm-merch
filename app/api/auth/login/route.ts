import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-simple";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { checkRateLimit } from "@/lib/rate-limit";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 5 attempts per minute per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimit = checkRateLimit(`login:${ip}`, 5, 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives de connexion. Réessaie dans 1 minute." },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetTime.toString(),
          }
        }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const result = await verifyPassword(email, password);
    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    const user = result.user;

    // Create JWT token
    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    }, {
      headers: {
        "X-RateLimit-Limit": "5",
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": rateLimit.resetTime.toString(),
      }
    });

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    );
  }
}
