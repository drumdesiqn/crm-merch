import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { PhotoIdSchema, validate } from "@/lib/validation";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

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

    const photos = await prisma.visitPhoto.findMany({
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
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string) || null;
    const category = (formData.get("category") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Format d'image non supporté" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    const visit = await prisma.visit.findFirst({ where: { id, userId: auth.user.userId }, select: { storeId: true } });
    if (!visit) {
      return NextResponse.json({ error: "Visite introuvable" }, { status: 404 });
    }

    const filename = `visits/${id}/${Date.now()}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });

    const photo = await prisma.visitPhoto.create({
      data: {
        visitId: id,
        storeId: visit?.storeId || null,
        userId: auth.user.userId,
        url: blob.url,
        blobKey: blob.url,
        caption,
        category: category === "before" || category === "after" ? category : null,
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
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await req.json();

    // Validate with Zod
    const validation = validate(PhotoIdSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const visit = await prisma.visit.findFirst({ where: { id, userId: auth.user.userId }, select: { storeId: true } });
    if (!visit) return NextResponse.json({ error: "Visite introuvable" }, { status: 404 });

    // Only allow deleting photos that belong to this visit or this store
    const photo = await prisma.visitPhoto.findFirst({ where: { id: validation.data.photoId, userId: auth.user.userId } });
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
    await prisma.visitPhoto.deleteMany({ where: { id: validation.data.photoId, userId: auth.user.userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/visits/[id]/photos");
  }
}