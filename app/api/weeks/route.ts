import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { WeekIdSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const weeks = await prisma.week.findMany({
      orderBy: [{ year: "desc" }, { weekNum: "desc" }],
      include: { _count: { select: { visits: true } } },
      take: 50, // Limit to prevent performance issues
    });
    return NextResponse.json(weeks);
  } catch (error) {
    return errorResponse(error, "GET /api/weeks");
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    
    // Validate with Zod
    const validation = validate(WeekIdSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    const { id } = validation.data;
    // Verify week exists before deleting
    const week = await prisma.week.findUnique({ where: { id } });
    if (!week) return NextResponse.json({ error: "Week not found" }, { status: 404 });

    // Clean up Vercel Blob files before deleting DB records
    const visitIds = (await prisma.visit.findMany({ where: { weekId: id }, select: { id: true } })).map((v) => v.id);
    if (visitIds.length > 0) {
      const photos = await prisma.visitPhoto.findMany({
        where: { visitId: { in: visitIds } },
        select: { blobKey: true },
      });
      const blobKeys = photos.map((p) => p.blobKey).filter(Boolean);
      if (blobKeys.length > 0) {
        try {
          await del(blobKeys, { token: process.env.BLOB_READ_WRITE_TOKEN });
        } catch (blobError) {
          console.error("[DELETE /api/weeks] Failed to delete blobs, proceeding with DB cleanup:", blobError);
        }
      }
    }

    await prisma.visit.deleteMany({ where: { weekId: id } });
    await prisma.week.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/weeks");
  }
}
