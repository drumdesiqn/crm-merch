import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.mailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to prevent performance issues
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
