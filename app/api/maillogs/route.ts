import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
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
