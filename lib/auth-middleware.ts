import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function verifyAuth(req: NextRequest): Promise<{ userId: string; email: string } | null> {
  try {
    const token = req.cookies.get("auth-token")?.value;
    
    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export function requireAuth(handler: (req: NextRequest, user: { userId: string; email: string }) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const user = await verifyAuth(req);
    
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }
    
    return handler(req, user);
  };
}
