import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
