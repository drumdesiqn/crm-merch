import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateLimit = checkRateLimit(`mail-logs:${ip}`, 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans 1 minute." }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const skip = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const logs = await prisma.mailLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        summary: true,
        replyDraft: true,
        status: true,
        createdAt: true,
        modifications: true,
      },
    });
    return NextResponse.json(logs);
  } catch (error) {
    return errorResponse(error, "GET /api/maillogs");
  }
}
