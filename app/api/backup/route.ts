import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function runBackup() {
  const [weeks, visits, notes, photos, mailLogs, modifications, settings, glossary] =
    await Promise.all([
      prisma.week.findMany(),
      prisma.visit.findMany(),
      prisma.visitNote.findMany(),
      prisma.visitPhoto.findMany({ select: { id: true, visitId: true, storeId: true, url: true, blobKey: true, caption: true, createdAt: true } }),
      prisma.mailLog.findMany(),
      prisma.modification.findMany(),
      prisma.settings.findMany(),
      prisma.glossaryTerm.findMany(),
    ]);

  let stores: unknown[] = [];
  try {
    stores = await prisma.store.findMany();
  } catch { /* Store table may not exist */ }

  const backup = {
    exportedAt: new Date().toISOString(),
    version: 1,
    counts: {
      weeks: weeks.length,
      visits: visits.length,
      stores: stores.length,
      notes: notes.length,
      photos: photos.length,
      mailLogs: mailLogs.length,
      modifications: modifications.length,
    },
    data: { weeks, visits, stores, notes, photos, mailLogs, modifications, settings, glossary },
  };

  const date = new Date().toISOString().split("T")[0];
  const filename = `backups/backup-${date}.json`;

  const blob = await put(filename, JSON.stringify(backup, null, 2), {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: "application/json",
    addRandomSuffix: false,
  });

  return { exportedAt: backup.exportedAt, counts: backup.counts, url: blob.url };
}

// Called by Vercel Cron (daily at 02:00 UTC) — authenticated via CRON_SECRET header.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runBackup();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[backup GET]", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}

// Called manually from SettingsPage — authenticated via JWT cookie.
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }
  try {
    const result = await runBackup();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[backup POST]", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
