import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NoteSchema, NoteIdSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const visit = await prisma.visit.findFirst({ where: { id, userId: auth.user.userId }, select: { storeId: true } });
    if (!visit) return NextResponse.json({ error: "Visite introuvable" }, { status: 404 });
    const storeId = visit?.storeId;

    const notes = await prisma.visitNote.findMany({
      where: {
        OR: [
          { visitId: id },
          ...(storeId ? [{ storeId }] : []),
        ],
        userId: auth.user.userId,
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
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await req.json();
    
    // Validate with Zod
    const validation = validate(NoteSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const visit = await prisma.visit.findFirst({ where: { id, userId: auth.user.userId }, select: { storeId: true } });
    if (!visit) return NextResponse.json({ error: "Visite introuvable" }, { status: 404 });
    
    const note = await prisma.visitNote.create({
      data: { visitId: id, storeId: visit?.storeId || null, content: validation.data.content.trim(), userId: auth.user.userId },
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
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await req.json();

    // Validate with Zod
    const validation = validate(NoteIdSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const visit = await prisma.visit.findFirst({ where: { id, userId: auth.user.userId }, select: { storeId: true } });
    if (!visit) return NextResponse.json({ error: "Visite introuvable" }, { status: 404 });

    // Only allow deleting notes that belong to this visit or this store
    await prisma.visitNote.deleteMany({
      where: {
        id: validation.data.noteId,
        userId: auth.user.userId,
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
