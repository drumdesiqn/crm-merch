import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PatchVisitSchema, BulkReorderSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekId = searchParams.get("weekId");

    const visits = await prisma.visit.findMany({
      where: weekId ? { weekId } : undefined,
      orderBy: [{ sortOrder: "asc" }, { visitDate: "asc" }],
      include: { week: true },
      ...(weekId ? {} : { take: 500 }),
    });

    return NextResponse.json(visits);
  } catch (error) {
    return errorResponse(error, "GET /api/visits");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    // Bulk reorder: { orders: [{ id, sortOrder }] }
    if (body.orders) {
      const validation = validate(BulkReorderSchema, body);
      if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      await Promise.all(
        validation.data.orders.map((u) =>
          prisma.visit.update({ where: { id: u.id }, data: { sortOrder: u.sortOrder } })
        )
      );
      return NextResponse.json({ success: true });
    }

    // Single update — whitelist editable fields with Zod validation
    const validation = validate(PatchVisitSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    const { id, ...rest } = validation.data;
    const ALLOWED = ["remarks", "salesRep", "visitType", "materials", "visitDate", "visitFrequence", "merchandiser", "status", "materialType"];
    const data = Object.fromEntries(Object.entries(rest).filter(([k]) => ALLOWED.includes(k)));
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });

    // Use transaction to prevent race condition when propagating materialType
    const result = await prisma.$transaction(async (tx) => {
      const visit = await tx.visit.update({ where: { id }, data });

      // If materialType changed, propagate to future visits of the same store
      if (data.materialType !== undefined && visit.storeId) {
        await tx.visit.updateMany({
          where: {
            storeId: visit.storeId,
            visitDate: { gte: visit.visitDate },
            id: { not: id },
            OR: [
              { materialType: null },
              { materialType: { not: data.materialType } },
            ],
          },
          data: { materialType: data.materialType },
        });
      }

      return visit;
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "PATCH /api/visits");
  }
}
