import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { CreateStoreSchema, PatchStoreSchema, validate } from "@/lib/validation";
import { getClientIp } from "@/lib/request-ip";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get("sortBy") || "name";
    const order = searchParams.get("order") || "asc";

    // Aggregate all data from Visit table (existing source of truth)
    const [visitAgg, photoCounts, completedAgg, materialTypes, distinctVisits] = await Promise.all([
      prisma.visit.groupBy({
        by: ["storeId"],
        _count: { id: true },
        _max: { visitDate: true },
      }),
      prisma.visitPhoto.groupBy({
        by: ["storeId"],
        _count: { id: true },
        where: { storeId: { not: null } },
      }),
      prisma.visit.groupBy({
        by: ["storeId"],
        _count: { id: true },
        where: { status: "done" },
      }),
      prisma.visit.findMany({
        select: { storeId: true, materialType: true },
        distinct: ["storeId", "materialType"],
      }),
      prisma.visit.findMany({
        select: { storeId: true, storeName: true, storeAddress: true, storeZipcode: true, storeCity: true, assortment: true, visitType: true, visitFrequence: true, salesRep: true },
        distinct: ["storeId"],
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const visitMap = new Map(visitAgg.map((v) => [v.storeId, v]));
    const photoCountMap = new Map(photoCounts.map((p) => [p.storeId, p._count.id]));
    const completedMap = new Map(completedAgg.map((c) => [c.storeId, c._count.id]));
    const materialMap = new Map<string, Set<string>>();
    for (const m of materialTypes) {
      if (!m.materialType) continue;
      if (!materialMap.has(m.storeId)) materialMap.set(m.storeId, new Set());
      materialMap.get(m.storeId)!.add(m.materialType);
    }

    // Build store map from Visit data (legacy source)
    const storeMap = new Map<string, {
      id: string; storeId: string; storeName: string; storeAddress: string;
      storeZipcode: string; storeCity: string; assortment: string;
      visitType: string; visitFrequence: string | null; salesRep: string | null;
      totalVisits: number; completedVisits: number; lastVisit: Date | null;
      materialTypes: string[]; totalPhotos: number;
    }>();

    for (const v of distinctVisits) {
      const agg = visitMap.get(v.storeId);
      storeMap.set(v.storeId, {
        id: v.storeId,
        storeId: v.storeId,
        storeName: v.storeName,
        storeAddress: v.storeAddress,
        storeZipcode: v.storeZipcode,
        storeCity: v.storeCity,
        assortment: v.assortment,
        visitType: v.visitType,
        visitFrequence: v.visitFrequence ?? null,
        salesRep: v.salesRep ?? null,
        totalVisits: agg?._count.id || 0,
        completedVisits: completedMap.get(v.storeId) || 0,
        lastVisit: agg?._max.visitDate || null,
        materialTypes: Array.from(materialMap.get(v.storeId) || []),
        totalPhotos: photoCountMap.get(v.storeId) || 0,
      });
    }

    // Overlay with manually created stores from Store table (if it exists)
    try {
      const manualStores = await prisma.store.findMany();
      for (const s of manualStores) {
        const agg = visitMap.get(s.storeId);
        storeMap.set(s.storeId, {
          id: s.id,
          storeId: s.storeId,
          storeName: s.storeName,
          storeAddress: s.storeAddress,
          storeZipcode: s.storeZipcode,
          storeCity: s.storeCity,
          assortment: s.assortment,
          visitType: s.visitType,
          visitFrequence: s.visitFrequence ?? null,
          salesRep: s.salesRep ?? null,
          totalVisits: agg?._count.id || 0,
          completedVisits: completedMap.get(s.storeId) || 0,
          lastVisit: agg?._max.visitDate || null,
          materialTypes: Array.from(materialMap.get(s.storeId) || []),
          totalPhotos: photoCountMap.get(s.storeId) || 0,
        });
      }
    } catch {
      // Store table may not exist yet — gracefully ignore
    }

    const result = Array.from(storeMap.values());

    if (sortBy === "visits") {
      result.sort((a, b) => order === "desc" ? b.totalVisits - a.totalVisits : a.totalVisits - b.totalVisits);
    } else if (sortBy === "lastVisit") {
      result.sort((a, b) => {
        const ta = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        const tb = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        return order === "desc" ? tb - ta : ta - tb;
      });
    } else if (sortBy === "city") {
      result.sort((a, b) => order === "desc" ? b.storeCity.localeCompare(a.storeCity) : a.storeCity.localeCompare(b.storeCity));
    } else {
      result.sort((a, b) => order === "desc" ? b.storeName.localeCompare(a.storeName) : a.storeName.localeCompare(b.storeName));
    }

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "GET /api/stores");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validate(PatchStoreSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { storeId, ...data } = validation.data;
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "Aucun champ à modifier" }, { status: 400 });

    // Update Store table if row exists
    let updated = null;
    try {
      const existing = await prisma.store.findUnique({ where: { storeId } });
      if (existing) {
        updated = await prisma.store.update({ where: { storeId }, data });
      }
    } catch {
      // Store table may not exist yet
    }

    // Propagate structural changes to all visits of this store
    const visitDataAll: Record<string, unknown> = {};
    if (data.storeName) visitDataAll.storeName = data.storeName;
    if (data.storeAddress) visitDataAll.storeAddress = data.storeAddress;
    if (data.storeZipcode) visitDataAll.storeZipcode = data.storeZipcode;
    if (data.storeCity) visitDataAll.storeCity = data.storeCity;
    if (data.assortment) visitDataAll.assortment = data.assortment;
    if (data.visitType) visitDataAll.visitType = data.visitType;
    if (data.visitFrequence !== undefined) visitDataAll.visitFrequence = data.visitFrequence;

    if (Object.keys(visitDataAll).length > 0) {
      await prisma.visit.updateMany({ where: { storeId }, data: visitDataAll });
    }

    // salesRep propagates only to future visits (past visits keep their historical value)
    if (data.salesRep !== undefined) {
      await prisma.visit.updateMany({
        where: { storeId, visitDate: { gte: new Date() } },
        data: { salesRep: data.salesRep },
      });
    }

    return NextResponse.json(updated || { storeId, ...data });
  } catch (error) {
    return errorResponse(error, "PATCH /api/stores");
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`stores-create:${ip}`, 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans 1 minute." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const validation = validate(CreateStoreSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const existing = await prisma.store.findUnique({ where: { storeId: validation.data.storeId } });
    if (existing) {
      return NextResponse.json({ error: "Un magasin avec cet ID existe déjà" }, { status: 409 });
    }

    const store = await prisma.store.create({
      data: {
        ...validation.data,
        assortment: validation.data.assortment || "",
        visitType: validation.data.visitType || "Maintenance",
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/stores");
  }
}