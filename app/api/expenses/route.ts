import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const expenses = await prisma.expense.findMany({
      where: { userId: auth.user.userId },
      orderBy: { expenseDate: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    return errorResponse(error, "GET /api/expenses");
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`expenses:${ip}`, 20, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Trop d'actions. Réessaie dans 1 minute." },
      { status: 429 }
    );
  }
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const formData = await req.formData();
    const description = (formData.get("description") as string || "").trim();
    const amountStr = formData.get("amount") as string;
    const expenseDateStr = formData.get("expenseDate") as string;
    const file = formData.get("file") as File | null;

    if (!description) {
      return NextResponse.json({ error: "Description requise" }, { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > 10000) {
      return NextResponse.json({ error: "Montant invalide (entre 0.01 et 10000)" }, { status: 400 });
    }

    if (!expenseDateStr) {
      return NextResponse.json({ error: "Date requise" }, { status: 400 });
    }

    const expenseDate = new Date(expenseDateStr);
    expenseDate.setHours(12, 0, 0, 0);

    let receiptUrl: string | null = null;
    let receiptKey: string | null = null;

    if (file) {
      const ext = MIME_TO_EXT[file.type];
      if (!ext) {
        return NextResponse.json({ error: "Format d'image non supporté" }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
      }

      const filename = `receipts/${Date.now()}.${ext}`;
      const blob = await put(filename, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
      });
      receiptUrl = blob.url;
      receiptKey = blob.url;
    }

    const expense = await prisma.expense.create({
      data: {
        userId: auth.user.userId,
        description,
        amount,
        expenseDate,
        receiptUrl,
        receiptKey,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    return errorResponse(error, "POST /api/expenses");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { id, description, amount, expenseDate, exported } = body as {
      id: string;
      description?: string;
      amount?: number;
      expenseDate?: string;
      exported?: boolean;
    };

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({
      where: { id, userId: auth.user.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Dépense introuvable" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (description !== undefined) data.description = description.trim();
    if (amount !== undefined) {
      if (isNaN(amount) || amount <= 0 || amount > 10000) {
        return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
      }
      data.amount = amount;
    }
    if (expenseDate !== undefined) {
      const d = new Date(expenseDate);
      d.setHours(12, 0, 0, 0);
      data.expenseDate = d;
    }
    if (exported === true) {
      data.exportedAt = new Date();
    } else if (exported === false) {
      data.exportedAt = null;
    }

    const updated = await prisma.expense.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error, "PATCH /api/expenses");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({
      where: { id, userId: auth.user.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Dépense introuvable" }, { status: 404 });
    }

    if (existing.receiptKey) {
      try { await del(existing.receiptKey); } catch {}
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/expenses");
  }
}
