import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = { userId: auth.user.userId };
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to);
    }

    const routes = await prisma.dayRoute.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json(routes);
  } catch (error) {
    return errorResponse(error, "GET /api/routes");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { date, distanceM, durationS, visitCount } = body as {
      date: string;
      distanceM: number;
      durationS: number;
      visitCount: number;
    };

    if (!date || typeof distanceM !== "number" || typeof durationS !== "number") {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    const routeDate = new Date(date);
    routeDate.setHours(0, 0, 0, 0);

    const route = await prisma.dayRoute.upsert({
      where: {
        userId_date: {
          userId: auth.user.userId,
          date: routeDate,
        },
      },
      update: {
        distanceM,
        durationS,
        visitCount: visitCount ?? 0,
      },
      create: {
        userId: auth.user.userId,
        date: routeDate,
        distanceM,
        durationS,
        visitCount: visitCount ?? 0,
      },
    });

    return NextResponse.json(route);
  } catch (error) {
    return errorResponse(error, "POST /api/routes");
  }
}
