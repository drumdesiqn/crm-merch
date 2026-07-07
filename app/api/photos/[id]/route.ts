import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const photo = await prisma.visitPhoto.update({
      where: { id },
      data: {
        ...(body.starred !== undefined ? { starred: Boolean(body.starred) } : {}),
        ...(body.caption !== undefined ? { caption: body.caption } : {}),
      },
    });

    return NextResponse.json(photo);
  } catch (error) {
    return errorResponse(error, "PATCH /api/photos/[id]");
  }
}
