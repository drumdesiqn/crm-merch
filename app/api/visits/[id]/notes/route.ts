import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NoteSchema, NoteIdSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visit = await prisma.visit.findUnique({ where: { id }, select: { storeId: true } });
    const storeId = visit?.storeId;

    const notes = await prisma.visitNote.findMany({
      where: {
        OR: [
          { visitId: id },
          ...(storeId ? [{ storeId }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        visit: {
          select: {
            visitDate: true,
            week: { select: { label: true } },
          },
        },
      },
    });
    return NextResponse.json(notes);
  } catch (error) {
    return errorResponse(error, "GET /api/visits/[id]/notes");
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Validate with Zod
    const validation = validate(NoteSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const visit = await prisma.visit.findUnique({ where: { id }, select: { storeId: true } });
    
    const note = await prisma.visitNote.create({
      data: { visitId: id, storeId: visit?.storeId || null, content: validation.data.content.trim() },
    });
    return NextResponse.json(note);
  } catch (error) {
    return errorResponse(error, "POST /api/visits/[id]/notes");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Validate with Zod
    const validation = validate(NoteIdSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const visit = await prisma.visit.findUnique({ where: { id }, select: { storeId: true } });

    // Only allow deleting notes that belong to this visit or this store
    await prisma.visitNote.delete({
      where: {
        id: validation.data.noteId,
        OR: [
          { visitId: id },
          ...(visit?.storeId ? [{ storeId: visit.storeId }] : []),
        ],
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/visits/[id]/notes");
  }
}
