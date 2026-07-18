import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { CreateContactSchema, PatchContactSchema, DeleteContactSchema } from "@/lib/validation";
import { requireAuth } from "@/lib/auth-server";
import { TEAMS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    let teams = await prisma.contactTeam.findMany({
      where: { userId: auth.user.userId },
      orderBy: { sortOrder: "asc" },
      include: {
        contacts: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (teams.length === 0) {
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < TEAMS.length; i++) {
          const t = TEAMS[i];
          const createdTeam = await tx.contactTeam.create({
            data: {
              userId: auth.user.userId,
              name: t.name,
              color: t.color,
              sortOrder: i + 1,
            },
            select: { id: true },
          });

          if (t.contacts.length > 0) {
            await tx.contact.createMany({
              data: t.contacts.map((c, idx) => ({
                userId: auth.user.userId,
                teamId: createdTeam.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                sortOrder: idx + 1,
              })),
            });
          }
        }
      });

      teams = await prisma.contactTeam.findMany({
        where: { userId: auth.user.userId },
        orderBy: { sortOrder: "asc" },
        include: {
          contacts: { orderBy: { sortOrder: "asc" } },
        },
      });
    }

    return NextResponse.json(teams);
  } catch (error) {
    return errorResponse(error, "GET /api/contacts");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const result = CreateContactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues.map((e) => e.message).join(", ") }, { status: 400 });
    }
    const { teamId, name, phone, email } = result.data;

    const maxOrder = await prisma.contact.aggregate({
      where: { teamId, userId: auth.user.userId },
      _max: { sortOrder: true },
    });

    const contact = await prisma.contact.create({
      data: { teamId, name, phone, email, sortOrder: (maxOrder._max?.sortOrder ?? 0) + 1, userId: auth.user.userId },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/contacts");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const result = PatchContactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues.map((e) => e.message).join(", ") }, { status: 400 });
    }
    const { id, ...data } = result.data;
    const contact = await prisma.contact.updateMany({ where: { id, userId: auth.user.userId }, data });
    return NextResponse.json(contact);
  } catch (error) {
    return errorResponse(error, "PATCH /api/contacts");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const result = DeleteContactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues.map((e) => e.message).join(", ") }, { status: 400 });
    }
    await prisma.contact.deleteMany({ where: { id: result.data.id, userId: auth.user.userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/contacts");
  }
}
