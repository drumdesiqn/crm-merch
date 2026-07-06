import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { MailAnalyzeResultSchema, MailAnalyzeSchema, validate } from "@/lib/validation";
import { getClientIp } from "@/lib/request-ip";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`mail-analyze:${ip}`, 30, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessaie dans 1 minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validation = validate(MailAnalyzeSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { content } = validation.data;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY non configurée sur le serveur." }, { status: 400 });
    }

    const currentWeek = await prisma.week.findFirst({
      orderBy: [{ year: "desc" }, { weekNum: "desc" }],
    });
    
    const currentWeekVisits = currentWeek
      ? await prisma.visit.findMany({
          where: { weekId: currentWeek.id },
          orderBy: [{ sortOrder: "asc" }, { visitDate: "asc" }],
          select: {
            id: true,
            storeName: true,
            storeCity: true,
            visitDate: true,
            visitType: true,
            remarks: true,
            salesRep: true,
          },
        })
      : [];

    const glossary = await prisma.glossaryTerm.findMany({ orderBy: { term: "asc" } });
    const glossaryText = glossary.map((g) => `- ${g.term}: ${g.definition}`).join("\n");

    const visitsContext = currentWeekVisits.length > 0
      ? currentWeekVisits
          .map(
            (v) =>
              `[${v.id}] ${v.storeName} (${v.storeCity}) - ${v.visitDate.toISOString().split("T")[0]} - ${v.visitType}${v.remarks ? ` - Remarque: ${v.remarks}` : ""} - Sales rep: ${v.salesRep || "N/A"}`
          )
          .join("\n")
      : "Aucune semaine importée";

    const systemPrompt = `Tu es un assistant pour un merchandiser de chez Mars (chocolats, petfood, snacking) en Belgique.
Tu analyses les emails reçus par le merchandiser et tu identifies les modifications à apporter à son planning.

GLOSSAIRE MÉTIER:
${glossaryText}

PLANNING EN COURS (${currentWeek?.label || "aucun"}):
${visitsContext}

Tu dois retourner un JSON avec cette structure exacte:
{
  "summary": "Résumé court du mail en 1-2 phrases",
  "actions": [
    {
      "action": "modify" | "add" | "delete" | "add_remark",
      "target": "nom du magasin ou store_id",
      "visitId": "id de la visite si connue, sinon null",
      "field": "champ à modifier (remarks, salesRep, visitDate, visitType, materials, etc.)",
      "oldValue": "valeur actuelle si connue",
      "newValue": "nouvelle valeur",
      "description": "Description lisible de l'action en français"
    }
  ],
  "replyDraft": "Brouillon de réponse au mail en français, ton professionnel, en 3-5 phrases"
}

Ne retourne QUE le JSON, sans markdown, sans explication.`;

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Voici l'email à analyser:\n\n${content}` },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content || "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { summary: raw, actions: [], replyDraft: "" };
    }

    const parsedValidation = validate(MailAnalyzeResultSchema, parsed);
    const normalized = parsedValidation.success
      ? parsedValidation.data
      : { summary: String((parsed as { summary?: string } | null)?.summary || raw), actions: [], replyDraft: "" };
    const actions = normalized.actions ?? [];

    const mailLog = await prisma.mailLog.create({
      data: {
        rawContent: content.slice(0, 10000),
        summary: normalized.summary,
        replyDraft: normalized.replyDraft,
        status: "analyzed",
      },
    });

    if (actions.length > 0) {
      await prisma.modification.createMany({
        data: actions.map((a) => ({
          mailLogId: mailLog.id,
          visitId: a.visitId || null,
          action: a.action,
          target: a.target || "",
          field: a.field || null,
          oldValue: a.oldValue || null,
          newValue: a.newValue || null,
          description: a.description || "",
          applied: false,
        })),
      });
    }

    const modifications = await prisma.modification.findMany({
      where: { mailLogId: mailLog.id },
    });

    return NextResponse.json({
      mailLogId: mailLog.id,
      summary: normalized.summary,
      replyDraft: normalized.replyDraft,
      modifications,
    });
  } catch (error) {
    return errorResponse(error, "POST /api/mail/analyze");
  }
}