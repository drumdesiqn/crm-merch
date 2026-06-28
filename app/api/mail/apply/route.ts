import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ModificationIdsSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = ["remarks", "salesRep", "visitType", "materials", "visitDate", "visitFrequence", "status", "materialType"];

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateLimit = checkRateLimit(`mail-apply:${ip}`, 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans 1 minute." }, { status: 429 });
  }

  try {
    const body = await req.json();

    const validation = validate(ModificationIdsSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { modificationIds } = validation.data;

    const modifications = await prisma.modification.findMany({
      where: { id: { in: modificationIds } },
    });

    // Limit modifications to current week to avoid unintended mass updates
    const currentWeek = await prisma.week.findFirst({
      orderBy: [{ year: "desc" }, { weekNum: "desc" }],
      select: { id: true },
    });

    const results = [];

    for (const mod of modifications) {
      try {
        if (mod.action === "add" || mod.action === "delete") {
          results.push({ id: mod.id, success: false, error: `Action "${mod.action}" non supportée — applique manuellement depuis le planning` });
          continue;
        }

        if (mod.action === "modify" || mod.action === "add_remark") {
          if (mod.field && mod.newValue !== null) {
            if (!ALLOWED_FIELDS.includes(mod.field)) {
              results.push({ id: mod.id, success: false, error: `Field "${mod.field}" is not allowed` });
              continue;
            }
            if (mod.target) {
              const targetClean = mod.target.replace(/\s*\([^)]*\)\s*$/, "").trim();
              const targetLower = mod.target.toLowerCase();
              const targetCleanLower = targetClean.toLowerCase();

              // First try exact id/storeId match
              let visits = await prisma.visit.findMany({
                where: {
                  ...(currentWeek ? { weekId: currentWeek.id } : {}),
                  OR: [
                    { id: mod.target },
                    { storeId: mod.target },
                  ],
                },
                select: {
                  id: true,
                  storeId: true,
                  storeName: true,
                },
              });

              // Fallback: case-insensitive name match in JS
              if (visits.length === 0 && currentWeek) {
                const weekVisits = await prisma.visit.findMany({
                  where: { weekId: currentWeek.id },
                  select: {
                    id: true,
                    storeId: true,
                    storeName: true,
                  },
                });
                visits = weekVisits.filter((v) => {
                  const name = v.storeName.toLowerCase();
                  return name.includes(targetLower) || name.includes(targetCleanLower);
                });
              }

              if (visits.length === 0) {
                results.push({ id: mod.id, success: false, error: `No visit found for target "${mod.target}"` });
                continue;
              }

              for (const visit of visits) {
                await prisma.visit.update({
                  where: { id: visit.id },
                  data: { [mod.field]: mod.newValue },
                });
              }
            }
          }
        }

        await prisma.modification.update({
          where: { id: mod.id },
          data: { applied: true },
        });

        results.push({ id: mod.id, success: true });
      } catch {
        results.push({ id: mod.id, success: false, error: "Erreur lors de l'application" });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return errorResponse(error, "POST /api/mail/apply");
  }
}
