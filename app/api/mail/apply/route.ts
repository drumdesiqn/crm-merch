import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_FIELDS = ["remarks", "salesRep", "visitType", "materials", "visitDate", "visitFrequence", "status", "materialType"];

export async function POST(req: NextRequest) {
  try {
    const { modificationIds } = await req.json();

    if (!modificationIds?.length) {
      return NextResponse.json({ error: "No modifications selected" }, { status: 400 });
    }

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
        if (mod.action === "modify" || mod.action === "add_remark") {
          if (mod.field && mod.newValue !== null) {
            if (!ALLOWED_FIELDS.includes(mod.field)) {
              results.push({ id: mod.id, success: false, error: `Field "${mod.field}" is not allowed` });
              continue;
            }
            if (mod.target) {
              const targetClean = mod.target.replace(/\s*\([^)]*\)\s*$/, "").trim();

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const visits = await prisma.visit.findMany({
                where: {
                  ...(currentWeek ? { weekId: currentWeek.id } : {}),
                  OR: [
                    { id: mod.target },
                    { storeId: mod.target },
                    { storeName: { contains: mod.target, mode: "insensitive" } as any },
                    { storeName: { contains: targetClean, mode: "insensitive" } as any },
                  ],
                },
              });

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
      } catch (err) {
        results.push({ id: mod.id, success: false, error: String(err) });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
