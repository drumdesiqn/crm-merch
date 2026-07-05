import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`guide-photo:${ip}`, 20, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Trop d'uploads. Réessaie dans 1 heure." },
      { status: 429 }
    );
  }
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const existing = await prisma.materialGuide.findUnique({ where: { name: decodedName } });
    if (existing?.blobKey) {
      try { await del(existing.blobKey, { token: process.env.BLOB_READ_WRITE_TOKEN }); } catch { /* ignore */ }
    }

    const blob = await put(`guide/${decodedName.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.jpg`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const record = await prisma.materialGuide.upsert({
      where: { name: decodedName },
      update: { photoUrl: blob.url, blobKey: blob.url },
      create: { name: decodedName, category: "snacking", photoUrl: blob.url, blobKey: blob.url },
    });

    return NextResponse.json(record);
  } catch (error) {
    return errorResponse(error, "POST /api/guide/[name]/photo");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const existing = await prisma.materialGuide.findUnique({ where: { name: decodedName } });
    if (existing?.blobKey) {
      try { await del(existing.blobKey, { token: process.env.BLOB_READ_WRITE_TOKEN }); } catch { /* ignore */ }
    }
    await prisma.materialGuide.updateMany({
      where: { name: decodedName },
      data: { photoUrl: null, blobKey: null },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/guide/[name]/photo");
  }
}