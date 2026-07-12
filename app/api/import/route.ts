import { NextRequest, NextResponse } from "next/server";
import { parseExcelBuffer } from "@/lib/excel-parser";
import { prisma } from "@/lib/prisma";
import { ImportSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { geocodeAddressServer } from "@/lib/geocode-server";
import { getClientIp } from "@/lib/request-ip";
import { put, del } from "@vercel/blob";
import { waitUntil } from "@vercel/functions";

export const dynamic = 'force-dynamic';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXCEL_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`import:${ip}`, 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Trop d'imports. Réessaie dans 1 heure." },
        { status: 429 }
      );
    }

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

    const fileName = (file.name || "").toLowerCase();
    const hasValidExtension = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    const hasValidMimeType = ALLOWED_EXCEL_MIME_TYPES.has(file.type);
    if (!hasValidExtension && !hasValidMimeType) {
      return NextResponse.json({ error: "Format de fichier invalide. Utilise un fichier Excel (.xlsx ou .xls)." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_IMPORT_FILE_SIZE) {
      return NextResponse.json({ error: `Fichier invalide: taille maximale ${MAX_IMPORT_FILE_SIZE / (1024 * 1024)}MB.` }, { status: 400 });
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
      // Clean up Vercel Blob photos before deleting visits
      const orphanPhotos = await prisma.visitPhoto.findMany({
        where: { visit: { weekId: existingWeek.id } },
        select: { blobKey: true },
      });
      if (orphanPhotos.length > 0) {
        void del(orphanPhotos.map((p) => p.blobKey)).catch(() => {});
      }
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
    } else if (mode === "new") {
      // Find a free virtual weekNum slot to bypass the unique(weekNum, year) constraint
      // We use offsets 1000+, 2000+, etc. — purely internal, display uses the label
      let virtualWeekNum = weekNum + 1000;
      let suffix = 2;
      while (await prisma.week.findUnique({ where: { weekNum_year: { weekNum: virtualWeekNum, year } } })) {
        virtualWeekNum = weekNum + 1000 * suffix;
        suffix++;
      }
      const newLabel = `${label} (${suffix - 1})`;
      week = await prisma.week.create({ data: { weekNum: virtualWeekNum, year, label: newLabel } });
    } else if (!existingWeek) {
      week = await prisma.week.create({ data: { weekNum, year, label } });
    } else {
      week = existingWeek;
    }

    // Store the Excel file in Vercel Blob for later preview
    try {
      const excelBlob = await put(`excels/${week!.id}/${file.name || "planning.xlsx"}`, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
      });
      await prisma.week.update({
        where: { id: week!.id },
        data: { excelUrl: excelBlob.url },
      });
    } catch (blobErr) {
      console.error("[import] Failed to store Excel blob, continuing:", blobErr);
    }

    // Pre-load latest materialType per storeId to carry it over to new visits (single query optimization)
    const storeIds = [...new Set(visitsToCreate.map((v) => v.storeId))];
    const latestVisits = await prisma.visit.findMany({
      where: {
        storeId: { in: storeIds },
      },
      orderBy: { visitDate: "desc" },
      select: { storeId: true, materialType: true, latitude: true, longitude: true },
    });

    const latestMaterialTypes: Record<string, string | null> = {};
    const latestCoords: Record<string, { lat: number; lng: number } | null> = {};
    latestVisits.forEach((v) => {
      if (!latestMaterialTypes[v.storeId] && v.materialType) {
        latestMaterialTypes[v.storeId] = v.materialType;
      }
      if (!latestCoords[v.storeId] && v.latitude && v.longitude) {
        latestCoords[v.storeId] = { lat: v.latitude, lng: v.longitude };
      }
    });

    // Pre-load Store table data: salesRep + corrected addresses (source of truth over Excel)
    const storeDataMap: Record<string, { salesRep: string | null; storeAddress: string; storeZipcode: string; storeCity: string }> = {};
    try {
      const storeRecords = await prisma.store.findMany({
        where: { storeId: { in: storeIds } },
        select: { storeId: true, salesRep: true, storeAddress: true, storeZipcode: true, storeCity: true },
      });
      storeRecords.forEach((s) => { storeDataMap[s.storeId] = { salesRep: s.salesRep ?? null, storeAddress: s.storeAddress, storeZipcode: s.storeZipcode, storeCity: s.storeCity }; });
    } catch {
      // Store table may not exist yet — gracefully ignore
    }

    await prisma.visit.createMany({
      data: visitsToCreate.map((v) => {
        const storeData = storeDataMap[v.storeId];
        const coords = latestCoords[v.storeId];
        return {
          weekId: week!.id,
          assortment: v.assortment,
          storeId: v.storeId,
          storeName: v.storeName,
          // Use corrected address from Store table if available, otherwise fall back to Excel
          storeAddress: storeData?.storeAddress || v.storeAddress,
          storeZipcode: storeData?.storeZipcode || v.storeZipcode,
          storeCity: storeData?.storeCity || v.storeCity,
          visitType: v.visitType,
          visitFrequence: v.visitFrequence,
          visitDate: v.visitDate,
          merchandiser: v.merchandiser,
          remarks: v.remarks,
          salesRep: storeData?.salesRep ?? v.salesRep ?? null,
          materials: v.materials,
          materialType: v.materialType || latestMaterialTypes[v.storeId] || null,
          // Carry over existing geocoding
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        };
      }),
    });

    // Upsert Store table — only create new stores from Excel, do NOT overwrite addresses on existing stores
    const uniqueVisits = Array.from(new Map(visitsToCreate.map((v) => [v.storeId, v])).values());
    try {
      await Promise.all(
        uniqueVisits.map((v) =>
          prisma.store.upsert({
            where: { storeId: v.storeId },
            update: {
              // Only update non-address fields; address corrections are preserved
              ...(v.assortment ? { assortment: v.assortment } : {}),
              ...(v.visitType ? { visitType: v.visitType } : {}),
              ...(v.visitFrequence ? { visitFrequence: v.visitFrequence } : {}),
            },
            create: {
              storeId: v.storeId,
              storeName: v.storeName,
              storeAddress: v.storeAddress,
              storeZipcode: v.storeZipcode,
              storeCity: v.storeCity,
              assortment: v.assortment || "",
              visitType: v.visitType || "Maintenance",
              visitFrequence: v.visitFrequence || null,
              salesRep: v.salesRep || null,
            },
          })
        )
      );
    } catch {
      // Store table may not exist yet — gracefully ignore
    }

    const response = NextResponse.json({
      success: true,
      weekNum,
      year,
      label,
      count: visitsToCreate.length,
      warnings,
    });

    // Background geocoding via waitUntil (serverless-safe — keeps function alive until done)
    const uniqueStores = Array.from(
      new Map(visitsToCreate.map((v) => [v.storeId, v])).values()
    );
    waitUntil(
      (async () => {
        for (const v of uniqueStores) {
          try {
            const coords = await geocodeAddressServer(v.storeAddress, v.storeZipcode, v.storeCity);
            if (coords) {
              await prisma.visit.updateMany({
                where: { storeId: v.storeId, latitude: null },
                data: { latitude: coords.lat, longitude: coords.lng },
              });
            }
          } catch {
            // silently ignore individual geocoding failures
          }
          // Nominatim requires >= 1s between requests
          await new Promise((r) => setTimeout(r, 1100));
        }
      })()
    );

    return response;
  } catch (error) {
    return errorResponse(error, "POST /api/import");
  }
}