import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SettingsSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const settings = await prisma.settings.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true, userName: true, userZone: true, userEmail: true, homeAddress: true },
    });
    const hasEnvApiKey = Boolean(process.env.OPENAI_API_KEY);
    if (!settings) {
      return NextResponse.json({ id: "singleton", userName: null, userZone: null, userEmail: null, hasApiKey: hasEnvApiKey });
    }
    return NextResponse.json({ ...settings, hasApiKey: hasEnvApiKey });
  } catch (error) {
    return errorResponse(error, "GET /api/settings");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    
    // Validate with Zod
    const validation = validate(SettingsSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    const { userName, userZone, userEmail, homeAddress } = validation.data;
    const allowed: Record<string, string | undefined> = {};
    if (userName !== undefined) allowed.userName = userName;
    if (userZone !== undefined) allowed.userZone = userZone;
    if (userEmail !== undefined) allowed.userEmail = userEmail;
    if (homeAddress !== undefined) allowed.homeAddress = homeAddress;

    const existing = await prisma.settings.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    const settings = existing
      ? await prisma.settings.update({
          where: { id: existing.id },
          data: allowed,
          select: { id: true, userName: true, userZone: true, userEmail: true, homeAddress: true },
        })
      : await prisma.settings.create({
          data: { ...allowed, userId: auth.user.userId },
          select: { id: true, userName: true, userZone: true, userEmail: true, homeAddress: true },
        });

    return NextResponse.json({ ...settings, hasApiKey: Boolean(process.env.OPENAI_API_KEY) });
  } catch (error) {
    return errorResponse(error, "POST /api/settings");
  }
}