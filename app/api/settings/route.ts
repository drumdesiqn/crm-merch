import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SettingsSchema, validate } from "@/lib/validation";

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      return NextResponse.json({ id: "singleton", openaiKey: null, userName: null, userZone: null, userEmail: null, hasApiKey: false });
    }
    const { openaiKey, ...safeSettings } = settings;
    return NextResponse.json({ ...safeSettings, hasApiKey: !!openaiKey });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
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
    
    const { userName, userZone, userEmail, homeAddress, openaiKey } = validation.data;
    const allowed: Record<string, string | undefined> = {};
    if (userName !== undefined) allowed.userName = userName;
    if (userZone !== undefined) allowed.userZone = userZone;
    if (userEmail !== undefined) allowed.userEmail = userEmail;
    if (homeAddress !== undefined) allowed.homeAddress = homeAddress;
    if (openaiKey !== undefined && openaiKey.trim()) allowed.openaiKey = openaiKey.trim();

    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...allowed },
      update: allowed,
    });
    const { openaiKey: savedKey, ...safeSettings } = settings;
    return NextResponse.json({ ...safeSettings, hasApiKey: !!savedKey });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
