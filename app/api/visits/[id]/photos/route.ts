import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { PhotoIdSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const dynamic = 'force-dynamic';

function photoRateLimit(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`visit-photos:${ip}`, 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Trop d'actions photo. Réessaie dans 1 minute." },
      { status: 429 }
    );
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visit = await prisma.visit.findUnique({ where: { id }, select: { storeId: true } });
    const storeId = visit?.storeId;

    const photos = await prisma.visitPhoto.findMany({
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
    return NextResponse.json(photos);
  } catch (error) {
    return errorResponse(error, "GET /api/visits/[id]/photos");
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = photoRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Format d'image non supporté" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `visits/${id}/${Date.now()}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const visit = await prisma.visit.findUnique({ where: { id }, select: { storeId: true } });

    const photo = await prisma.visitPhoto.create({
      data: {
        visitId: id,
        storeId: visit?.storeId || null,
        url: blob.url,
        blobKey: blob.url,
        caption,
      },
    });

    return NextResponse.json(photo);
  } catch (error) {
    return errorResponse(error, "POST /api/visits/[id]/photos");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = photoRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const { id } = await params;
    const body = await req.json();

    // Validate with Zod
    const validation = validate(PhotoIdSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const visit = await prisma.visit.findUnique({ where: { id }, select: { storeId: true } });

    // Only allow deleting photos that belong to this visit or this store
    const photo = await prisma.visitPhoto.findUnique({ where: { id: validation.data.photoId } });
    if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    const belongsToVisit = photo.visitId === id;
    const belongsToStore = visit?.storeId && photo.storeId === visit.storeId;
    if (!belongsToVisit && !belongsToStore) {
      return NextResponse.json({ error: "Photo does not belong to this visit" }, { status: 403 });
    }

    try {
      await del(photo.blobKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (blobError) {
      console.error("Failed to delete blob, proceeding with DB cleanup:", blobError);
    }
    await prisma.visitPhoto.delete({ where: { id: validation.data.photoId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/visits/[id]/photos");
  }
}