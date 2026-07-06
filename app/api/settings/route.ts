import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SettingsSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
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

    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...allowed },
      update: allowed,
      select: { id: true, userName: true, userZone: true, userEmail: true, homeAddress: true },
    });
    return NextResponse.json({ ...settings, hasApiKey: Boolean(process.env.OPENAI_API_KEY) });
  } catch (error) {
    return errorResponse(error, "POST /api/settings");
  }
}