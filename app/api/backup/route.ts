import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function runBackup(userId?: string) {
  const [weeks, visits, notes, photos, settings, glossary] = await Promise.all([
    userId ? prisma.week.findMany({ where: { userId } }) : prisma.week.findMany(),
    userId ? prisma.visit.findMany({ where: { userId } }) : prisma.visit.findMany(),
    userId ? prisma.visitNote.findMany({ where: { userId } }) : prisma.visitNote.findMany(),
    userId
      ? prisma.visitPhoto.findMany({ where: { userId }, select: { id: true, visitId: true, storeId: true, url: true, blobKey: true, caption: true, createdAt: true } })
      : prisma.visitPhoto.findMany({ select: { id: true, visitId: true, storeId: true, url: true, blobKey: true, caption: true, createdAt: true } }),
    userId ? prisma.settings.findMany({ where: { userId } }) : prisma.settings.findMany(),
    userId ? prisma.glossaryTerm.findMany({ where: { userId } }) : prisma.glossaryTerm.findMany(),
  ]);

  const visitIds = visits.map((v) => v.id);
  const modifications = userId
    ? await prisma.modification.findMany({ where: { visitId: { in: visitIds } } })
    : await prisma.modification.findMany();

  const mailLogIds = Array.from(new Set(modifications.map((m) => m.mailLogId).filter(Boolean) as string[]));
  const mailLogs = userId
    ? (mailLogIds.length > 0 ? await prisma.mailLog.findMany({ where: { id: { in: mailLogIds } } }) : [])
    : await prisma.mailLog.findMany();

  let stores: unknown[] = [];
  try {
    stores = userId ? await prisma.store.findMany({ where: { userId } }) : await prisma.store.findMany();
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
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  try {
    const result = await runBackup(auth.user.userId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[backup POST]", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
