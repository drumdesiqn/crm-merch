import { NextRequest, NextResponse } from "next/server";
import { parseExcelBuffer } from "@/lib/excel-parser";
import { prisma } from "@/lib/prisma";
import { ImportSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawMode = (formData.get("mode") as string) || "replace";

    const modeValidation = validate(ImportSchema, { mode: rawMode });
    if (!modeValidation.success) {
      return NextResponse.json({ error: modeValidation.error }, { status: 400 });
    }
    const mode = modeValidation.data.mode;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { visits, weekNum, year, label, warnings } = parseExcelBuffer(buffer);

    if (visits.length === 0) {
      return NextResponse.json({ error: "No visits found in file" }, { status: 400 });
    }

    const existingWeek = await prisma.week.findUnique({
      where: { weekNum_year: { weekNum, year } },
    });

    if (existingWeek && mode === "check") {
      return NextResponse.json({
        exists: true,
        weekNum,
        year,
        label,
        count: visits.length,
      });
    }

    let week;
    let visitsToCreate = visits;

    if (existingWeek && mode === "replace") {
      await prisma.visit.deleteMany({ where: { weekId: existingWeek.id } });
      week = existingWeek;
    } else if (existingWeek && mode === "merge") {
      week = existingWeek;
      const existing = await prisma.visit.findMany({
        where: { weekId: existingWeek.id },
        select: { storeId: true, visitDate: true },
      });
      const existingKeys = new Set(
        existing.map((v) => `${v.storeId}_${v.visitDate.toISOString().split("T")[0]}`)
      );
      visitsToCreate = visits.filter(
        (v) => !existingKeys.has(`${v.storeId}_${v.visitDate.toISOString().split("T")[0]}`)
      );
      if (visitsToCreate.length === 0) {
        return NextResponse.json({ success: true, weekNum, year, label, count: 0, warnings: ["Aucune nouvelle visite à fusionner — toutes les visites existent déjà."] });
      }
    } else if (!existingWeek) {
      week = await prisma.week.create({ data: { weekNum, year, label } });
    } else {
      week = existingWeek;
    }

    // Pre-load latest materialType per storeId to carry it over to new visits (single query optimization)
    const storeIds = [...new Set(visitsToCreate.map((v) => v.storeId))];
    const latestVisits = await prisma.visit.findMany({
      where: {
        storeId: { in: storeIds },
        materialType: { not: null },
      },
      orderBy: { visitDate: "desc" },
      select: { storeId: true, materialType: true },
    });

    const latestMaterialTypes: Record<string, string | null> = {};
    latestVisits.forEach((v) => {
      if (!latestMaterialTypes[v.storeId]) {
        latestMaterialTypes[v.storeId] = v.materialType;
      }
    });

    await prisma.visit.createMany({
      data: visitsToCreate.map((v) => ({
        weekId: week!.id,
        assortment: v.assortment,
        storeId: v.storeId,
        storeName: v.storeName,
        storeAddress: v.storeAddress,
        storeZipcode: v.storeZipcode,
        storeCity: v.storeCity,
        visitType: v.visitType,
        visitFrequence: v.visitFrequence,
        visitDate: v.visitDate,
        merchandiser: v.merchandiser,
        remarks: v.remarks,
        salesRep: v.salesRep,
        materials: v.materials,
        materialType: v.materialType || latestMaterialTypes[v.storeId] || null,
      })),
    });

    return NextResponse.json({
      success: true,
      weekNum,
      year,
      label,
      count: visitsToCreate.length,
      warnings,
    });
  } catch (error) {
    return errorResponse(error, "POST /api/import");
  }
}
