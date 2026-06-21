import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WeekIdSchema, validate } from "@/lib/validation";

export async function GET() {
  try {
    const weeks = await prisma.week.findMany({
      orderBy: [{ year: "desc" }, { weekNum: "desc" }],
      include: { _count: { select: { visits: true } } },
      take: 50, // Limit to prevent performance issues
    });
    return NextResponse.json(weeks);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
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
    await prisma.visit.deleteMany({ where: { weekId: id } });
    await prisma.week.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
