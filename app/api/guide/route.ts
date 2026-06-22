import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { MATERIAL_TYPES } from "@/lib/constants";

export async function GET() {
  try {
    const existing = await prisma.materialGuide.findMany();
    const byName = Object.fromEntries(existing.map((e) => [e.name, e]));

    const result = MATERIAL_TYPES.map((t) => ({
      name: t.name,
      category: t.category,
      photoUrl: byName[t.name]?.photoUrl ?? null,
      blobKey: byName[t.name]?.blobKey ?? null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "GET /api/guide");
  }
}
