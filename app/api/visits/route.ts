import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PatchVisitSchema, BulkReorderSchema, CreateVisitSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";
import { getISOWeek } from "@/lib/utils";
import { geocodeAddressServer } from "@/lib/geocode-server";
import { waitUntil } from "@vercel/functions";

export const dynamic = 'force-dynamic';

function getWeekLabel(date: Date) {
  const weekNum = getISOWeek(date);
  const year = date.getUTCFullYear();
  return { weekNum, year, label: `W${weekNum} ${year}` };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekId = searchParams.get("weekId");

    const visits = await prisma.visit.findMany({
      where: weekId ? { weekId } : undefined,
      orderBy: [{ sortOrder: "asc" }, { visitDate: "asc" }],
      select: {
        id: true,
        weekId: true,
        assortment: true,
        storeId: true,
        storeName: true,
        storeAddress: true,
        storeZipcode: true,
        storeCity: true,
        visitType: true,
        visitFrequence: true,
        visitDate: true,
        merchandiser: true,
        remarks: true,
        salesRep: true,
        materials: true,
        sortOrder: true,
        status: true,
        materialType: true,
        latitude: true,
        longitude: true,
        week: true,
      },
      ...(weekId ? {} : { take: 500 }),
    });

    const headers: Record<string, string> = {};
    if (!weekId && visits.length === 500) {
      headers["X-Results-Truncated"] = "true";
    }
    return NextResponse.json(visits, { headers });
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
    const ALLOWED = ["remarks", "salesRep", "visitType", "materials", "visitDate", "visitFrequence", "merchandiser", "status", "materialType", "storeName", "storeAddress", "storeZipcode", "storeCity", "latitude", "longitude"];
    const data: Record<string, unknown> = Object.fromEntries(Object.entries(rest).filter(([k]) => ALLOWED.includes(k)));
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });

    // Convert visitDate string to DateTime at UTC noon (avoid timezone shift)
    if (data.visitDate && typeof data.visitDate === "string") {
      const [y, m, d] = data.visitDate.split("-").map(Number);
      data.visitDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    }

    // Use transaction to prevent race condition when propagating changes
    const result = await prisma.$transaction(async (tx) => {
      const visit = await tx.visit.update({
        where: { id },
        data,
        select: {
          id: true,
          weekId: true,
          assortment: true,
          storeId: true,
          storeName: true,
          storeAddress: true,
          storeZipcode: true,
          storeCity: true,
          visitType: true,
          visitFrequence: true,
          visitDate: true,
          merchandiser: true,
          remarks: true,
          salesRep: true,
          materials: true,
          sortOrder: true,
          status: true,
          materialType: true,
          latitude: true,
          longitude: true,
        },
      });

      // If materialType changed, propagate to future visits of the same store
      if (data.materialType !== undefined && visit.storeId) {
        const matType = data.materialType as string | null;
        await tx.visit.updateMany({
          where: {
            storeId: visit.storeId,
            visitDate: { gte: visit.visitDate },
            id: { not: id },
          },
          data: { materialType: matType },
        });
      }

      // If address changed, propagate to ALL visits of the same store
      const addressFields: Record<string, string> = {};
      if (data.storeAddress) addressFields.storeAddress = data.storeAddress as string;
      if (data.storeZipcode) addressFields.storeZipcode = data.storeZipcode as string;
      if (data.storeCity) addressFields.storeCity = data.storeCity as string;
      if (Object.keys(addressFields).length > 0 && visit.storeId) {
        await tx.visit.updateMany({
          where: { storeId: visit.storeId, id: { not: id } },
          data: addressFields,
        });
      }

      return visit;
    });

    // Re-geocode if address changed
    const addressChanged = data.storeAddress || data.storeZipcode || data.storeCity;
    if (addressChanged && result.storeId) {
      const addr = result.storeAddress;
      const zip = result.storeZipcode;
      const city = result.storeCity;
      const storeId = result.storeId;
      waitUntil(
        (async () => {
          try {
            const coords = await geocodeAddressServer(addr, zip, city);
            if (coords) {
              await prisma.visit.updateMany({
                where: { storeId },
                data: { latitude: coords.lat, longitude: coords.lng },
              });
            }
          } catch {
            // silently ignore geocoding failures
          }
        })()
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "PATCH /api/visits");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validate(CreateVisitSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { storeId, weekId, visitDate, visitType, assortment, merchandiser, remarks, salesRep } = validation.data;

    // Look up store: first in Store table, then fall back to Visit history
    let store: { storeId: string; storeName: string; storeAddress: string; storeZipcode: string; storeCity: string; assortment: string; visitType: string; visitFrequence: string | null; salesRep?: string | null } | null = null;
    try {
      store = await prisma.store.findUnique({ where: { storeId } });
    } catch {
      // Store table may not exist yet
    }
    if (!store) {
      const lastVisit = await prisma.visit.findFirst({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        select: { storeId: true, storeName: true, storeAddress: true, storeZipcode: true, storeCity: true, assortment: true, visitType: true, visitFrequence: true, salesRep: true },
      });
      if (lastVisit) store = lastVisit;
    }
    if (!store) {
      return NextResponse.json({ error: "Magasin non trouvé. Ajoute-le d'abord via la page Magasins." }, { status: 404 });
    }

    const [y, m, d] = visitDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const { weekNum, year, label } = getWeekLabel(date);

    let week;
    if (weekId) {
      week = await prisma.week.findUnique({ where: { id: weekId } });
    }
    if (!week) {
      week = await prisma.week.upsert({
        where: { weekNum_year: { weekNum, year } },
        update: {},
        create: { weekNum, year, label },
      });
    }

    const maxOrder = await prisma.visit.aggregate({
      where: { weekId: week.id },
      _max: { sortOrder: true },
    });

    const visit = await prisma.visit.create({
      data: {
        weekId: week.id,
        assortment: assortment || store.assortment || "",
        storeId: store.storeId,
        storeName: store.storeName,
        storeAddress: store.storeAddress,
        storeZipcode: store.storeZipcode,
        storeCity: store.storeCity,
        visitType: visitType || store.visitType || "Maintenance",
        visitFrequence: store.visitFrequence,
        visitDate: date,
        merchandiser: merchandiser || null,
        remarks: remarks || null,
        salesRep: salesRep || store.salesRep || null,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json({ ...visit, week: { label: week.label } }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/visits");
  }
}
