import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ModificationIdsSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = ["remarks", "salesRep", "visitType", "materials", "visitDate", "visitFrequence", "status", "materialType"];
const ALLOWED_STATUSES = new Set(["pending", "done", "cancelled", "postponed"]);

function toUtcNoon(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function normalizeFieldValue(field: string, newValue: string): { ok: true; value: unknown } | { ok: false; error: string } {
  if (field === "visitDate") {
    const date = toUtcNoon(newValue.trim());
    if (!date) return { ok: false, error: "Date invalide (format attendu YYYY-MM-DD)" };
    return { ok: true, value: date };
  }

  if (field === "status") {
    const status = newValue.trim();
    if (!ALLOWED_STATUSES.has(status)) {
      return { ok: false, error: `Statut non supporté: ${status}` };
    }
    return { ok: true, value: status };
  }

  return { ok: true, value: newValue };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
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
            const normalizedValue = normalizeFieldValue(mod.field, mod.newValue);
            if (!normalizedValue.ok) {
              results.push({ id: mod.id, success: false, error: normalizedValue.error });
              continue;
            }

            let visits: { id: string; storeId: string; storeName: string }[] = [];

            if (mod.visitId) {
              const byId = await prisma.visit.findUnique({
                where: { id: mod.visitId },
                select: { id: true, storeId: true, storeName: true, weekId: true },
              });
              if (byId && (!currentWeek || byId.weekId === currentWeek.id)) {
                visits = [{ id: byId.id, storeId: byId.storeId, storeName: byId.storeName }];
              }
            }

            if (visits.length === 0 && mod.target) {
              const targetClean = mod.target.replace(/\s*\([^)]*\)\s*$/, "").trim();
              const targetLower = mod.target.toLowerCase();
              const targetCleanLower = targetClean.toLowerCase();

              visits = await prisma.visit.findMany({
                where: {
                  ...(currentWeek ? { weekId: currentWeek.id } : {}),
                  OR: [{ id: mod.target }, { storeId: mod.target }],
                },
                select: { id: true, storeId: true, storeName: true },
              });

              if (visits.length === 0 && currentWeek) {
                const weekVisits = await prisma.visit.findMany({
                  where: { weekId: currentWeek.id },
                  select: { id: true, storeId: true, storeName: true },
                });
                visits = weekVisits.filter((v) => {
                  const name = v.storeName.toLowerCase();
                  return name.includes(targetLower) || name.includes(targetCleanLower);
                });
              }
            }

            if (visits.length === 0) {
              results.push({ id: mod.id, success: false, error: `No visit found for target "${mod.target}"` });
              continue;
            }

            if (visits.length > 1 && !mod.visitId) {
              results.push({ id: mod.id, success: false, error: "Modification ambiguë: plusieurs visites correspondent. Spécifie une visite unique." });
              continue;
            }

            for (const visit of visits) {
              await prisma.visit.update({
                where: { id: visit.id },
                data: { [mod.field]: normalizedValue.value },
              });
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