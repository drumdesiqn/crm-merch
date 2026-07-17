import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export type AuthTokenPayload = {
  userId: string;
  email: string;
};

function getJwtSecret(): Uint8Array {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const jwtSecret = getJwtSecret();
    const { payload } = await jwtVerify(token, jwtSecret);

    const userId = typeof payload.userId === "string" ? payload.userId : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!userId || !email) return null;

    return { userId, email };
  } catch {
    return null;
  }
}

export async function getAuthFromRequest(req: NextRequest): Promise<AuthTokenPayload | null> {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

export async function requireAuth(req: NextRequest): Promise<
  { ok: true; user: AuthTokenPayload } |
  { ok: false; response: NextResponse }
> {
  const user = await getAuthFromRequest(req);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}
