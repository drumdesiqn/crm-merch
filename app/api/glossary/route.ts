import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_GLOSSARY } from "@/lib/utils";
import { GlossaryTermSchema, GlossaryIdSchema, validate } from "@/lib/validation";

export async function GET() {
  try {
    let terms = await prisma.glossaryTerm.findMany({ 
      orderBy: { term: "asc" },
      take: 100, // Limit to prevent performance issues
    });
    if (terms.length === 0) {
      await prisma.glossaryTerm.createMany({
        data: DEFAULT_GLOSSARY,
        skipDuplicates: true,
      });
      terms = await prisma.glossaryTerm.findMany({ 
        orderBy: { term: "asc" },
        take: 100,
      });
    }
    return NextResponse.json(terms);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate with Zod
    const validation = validate(GlossaryTermSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    const term = await prisma.glossaryTerm.upsert({
      where: { term: validation.data.term },
      create: validation.data,
      update: { definition: validation.data.definition },
    });
    return NextResponse.json(term);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate with Zod
    const validation = validate(GlossaryIdSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    await prisma.glossaryTerm.delete({ where: { id: validation.data.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
