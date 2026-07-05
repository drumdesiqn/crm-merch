import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateContactSchema = z.object({
  teamId: z.string().min(1, "Équipe requise"),
  name: z.string().min(1, "Nom requis").max(200),
  phone: z.string().min(1, "Téléphone requis").max(50),
  email: z.string().email("Email invalide").max(200),
});

const PatchContactSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(1).max(50).optional(),
  email: z.string().email().max(200).optional(),
  teamId: z.string().min(1).optional(),
});

const DeleteContactSchema = z.object({
  id: z.string().min(1),
});

export async function GET() {
  try {
    const teams = await prisma.contactTeam.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        contacts: { orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json(teams);
  } catch (error) {
    return errorResponse(error, "GET /api/contacts");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = CreateContactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues.map((e) => e.message).join(", ") }, { status: 400 });
    }
    const { teamId, name, phone, email } = result.data;

    const maxOrder = await prisma.contact.aggregate({
      where: { teamId },
      _max: { sortOrder: true },
    });

    const contact = await prisma.contact.create({
      data: { teamId, name, phone, email, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/contacts");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const result = PatchContactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues.map((e) => e.message).join(", ") }, { status: 400 });
    }
    const { id, ...data } = result.data;
    const contact = await prisma.contact.update({ where: { id }, data });
    return NextResponse.json(contact);
  } catch (error) {
    return errorResponse(error, "PATCH /api/contacts");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const result = DeleteContactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues.map((e) => e.message).join(", ") }, { status: 400 });
    }
    await prisma.contact.delete({ where: { id: result.data.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/contacts");
  }
}
