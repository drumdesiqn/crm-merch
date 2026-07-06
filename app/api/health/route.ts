import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  let dbOk = false;

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    dbOk = true;
  } catch {
    // DB unreachable
  }

  return NextResponse.json(
    {
      status: dbOk ? "healthy" : "degraded",
      uptime: process.uptime(),
      db: dbOk ? "connected" : "unreachable",
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 }
  );
}
