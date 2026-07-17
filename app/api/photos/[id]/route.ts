import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await req.json();

    await prisma.visitPhoto.updateMany({
      where: { id, userId: auth.user.userId },
      data: {
        ...(body.starred !== undefined ? { starred: Boolean(body.starred) } : {}),
        ...(body.caption !== undefined ? { caption: body.caption } : {}),
      },
    });

    const photo = await prisma.visitPhoto.findFirst({ where: { id, userId: auth.user.userId } });
    if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

    return NextResponse.json(photo);
  } catch (error) {
    return errorResponse(error, "PATCH /api/photos/[id]");
  }
}
