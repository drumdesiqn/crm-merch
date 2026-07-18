import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SettingsSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

const settingsBaseSelect = {
  id: true,
  userName: true,
  userZone: true,
  userEmail: true,
  homeAddress: true,
} as const;

const settingsWithEndSelect = {
  ...settingsBaseSelect,
  endAddress: true,
} as const;

function isMissingEndAddressColumn(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2022") return false;
  const column = typeof error.meta?.column === "string" ? error.meta.column : "";
  return column.includes("endAddress");
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    let settings:
      | { id: string; userName: string | null; userZone: string | null; userEmail: string | null; homeAddress: string | null; endAddress: string | null }
      | { id: string; userName: string | null; userZone: string | null; userEmail: string | null; homeAddress: string | null }
      | null = null;

    try {
      settings = await prisma.settings.findFirst({
        where: { userId: auth.user.userId },
        select: settingsWithEndSelect,
      });
    } catch (error) {
      if (!isMissingEndAddressColumn(error)) throw error;
      settings = await prisma.settings.findFirst({
        where: { userId: auth.user.userId },
        select: settingsBaseSelect,
      });
    }

    const hasEnvApiKey = Boolean(process.env.OPENAI_API_KEY);
    if (!settings) {
      return NextResponse.json({ id: "singleton", userName: null, userZone: null, userEmail: null, homeAddress: null, endAddress: null, hasApiKey: hasEnvApiKey });
    }
    const endAddress = "endAddress" in settings ? settings.endAddress : null;
    return NextResponse.json({ ...settings, endAddress, hasApiKey: hasEnvApiKey });
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
    
    const { userName, userZone, userEmail, homeAddress, endAddress } = validation.data;
    const allowed: Record<string, string | undefined> = {};
    if (userName !== undefined) allowed.userName = userName;
    if (userZone !== undefined) allowed.userZone = userZone;
    if (userEmail !== undefined) allowed.userEmail = userEmail;
    if (homeAddress !== undefined) allowed.homeAddress = homeAddress;
    if (endAddress !== undefined) allowed.endAddress = endAddress;

    const existing = await prisma.settings.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    const writeSettings = async (data: Record<string, string | undefined>, withEndAddress: boolean) => {
      return existing
        ? prisma.settings.update({
            where: { id: existing.id },
            data,
            select: withEndAddress ? settingsWithEndSelect : settingsBaseSelect,
          })
        : prisma.settings.create({
            data: { ...data, userId: auth.user.userId },
            select: withEndAddress ? settingsWithEndSelect : settingsBaseSelect,
          });
    };

    let settings:
      | { id: string; userName: string | null; userZone: string | null; userEmail: string | null; homeAddress: string | null; endAddress: string | null }
      | { id: string; userName: string | null; userZone: string | null; userEmail: string | null; homeAddress: string | null };

    try {
      settings = await writeSettings(allowed, true);
    } catch (error) {
      if (!isMissingEndAddressColumn(error)) throw error;
      const { endAddress: _ignored, ...legacyAllowed } = allowed;
      settings = await writeSettings(legacyAllowed, false);
    }

    const endAddressValue = "endAddress" in settings ? settings.endAddress : null;
    return NextResponse.json({ ...settings, endAddress: endAddressValue, hasApiKey: Boolean(process.env.OPENAI_API_KEY) });
  } catch (error) {
    return errorResponse(error, "POST /api/settings");
  }
}