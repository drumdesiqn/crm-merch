import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_GLOSSARY } from "@/lib/utils";
import { GlossaryTermSchema, GlossaryIdSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    let terms = await prisma.glossaryTerm.findMany({ 
      where: { userId: auth.user.userId },
      orderBy: { term: "asc" },
      take: 100, // Limit to prevent performance issues
    });
    if (terms.length === 0) {
      await prisma.glossaryTerm.createMany({
        data: DEFAULT_GLOSSARY.map((t) => ({ ...t, userId: auth.user.userId })),
        skipDuplicates: true,
      });
      terms = await prisma.glossaryTerm.findMany({ 
        where: { userId: auth.user.userId },
        orderBy: { term: "asc" },
        take: 100,
      });
    }
    return NextResponse.json(terms);
  } catch (error) {
    return errorResponse(error, "GET /api/glossary");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    
    // Validate with Zod
    const validation = validate(GlossaryTermSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    const existing = await prisma.glossaryTerm.findFirst({
      where: { term: validation.data.term, userId: auth.user.userId },
      select: { id: true },
    });

    const term = existing
      ? await prisma.glossaryTerm.update({
          where: { id: existing.id },
          data: { definition: validation.data.definition },
        })
      : await prisma.glossaryTerm.create({
          data: { ...validation.data, userId: auth.user.userId },
        });
    return NextResponse.json(term);
  } catch (error) {
    return errorResponse(error, "POST /api/glossary");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    
    // Validate with Zod
    const validation = validate(GlossaryIdSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    await prisma.glossaryTerm.deleteMany({ where: { id: validation.data.id, userId: auth.user.userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/glossary");
  }
}
