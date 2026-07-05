import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/api-utils";
import { ChatSchema, validate } from "@/lib/validation";
import { getClientIp } from "@/lib/request-ip";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`chat:${ip}`, 20, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessaie dans un moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validation = validate(ChatSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { messages } = validation.data;

    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    const apiKey = process.env.OPENAI_API_KEY || settings?.openaiKey;
    if (!process.env.OPENAI_API_KEY && settings?.openaiKey) {
      console.warn("[chat] Using OpenAI key from DB. Consider setting OPENAI_API_KEY env var instead.");
    }

    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured. Go to Settings." }, { status: 400 });
    }

    const currentWeek = await prisma.week.findFirst({
      orderBy: [{ year: "desc" }, { weekNum: "desc" }],
    });
    
    const currentWeekVisits = currentWeek 
      ? await prisma.visit.findMany({
          where: { weekId: currentWeek.id },
          orderBy: [{ sortOrder: "asc" }, { visitDate: "asc" }],
        })
      : [];

    const glossary = await prisma.glossaryTerm.findMany({ orderBy: { term: "asc" } });
    const glossaryText = glossary.map((g) => `- ${g.term}: ${g.definition}`).join("\n");

    const recentMods = await prisma.modification.findMany({
      where: { applied: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { mailLog: true },
    });

    const modsText = recentMods.length > 0
      ? recentMods.map((m) => `- ${m.description} (${m.createdAt.toLocaleDateString("fr-BE")})`).join("\n")
      : "Aucune modification récente";

    const today = new Date();
    const todayStr = today.toLocaleDateString("fr-BE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

    let planningText = "Aucun planning importé";
    if (currentWeek && currentWeekVisits.length > 0) {
      const byDay = currentWeekVisits.reduce<Record<string, typeof currentWeekVisits>>((acc, v) => {
        const day = v.visitDate.toISOString().split("T")[0];
        if (!acc[day]) acc[day] = [];
        acc[day].push(v);
        return acc;
      }, {});

      planningText = `Semaine ${currentWeek.label}:\n` + Object.entries(byDay).map(([day, dayVisits]) => {
        const [dy, dm, dd] = day.split("-").map(Number);
        const localDate = new Date(dy, dm - 1, dd);
        const dayLabel = localDate.toLocaleDateString("fr-BE", { weekday: "long", day: "2-digit", month: "2-digit" });
        return `${dayLabel}:\n` + dayVisits.map((v) =>
          `  - ${v.storeName} (${v.storeCity}, ${v.storeZipcode}) | ${v.visitType} | Sales rep: ${v.salesRep || "N/A"}${v.remarks ? ` | REMARQUE: ${v.remarks}` : ""}${v.materials ? ` | Matériel: ${v.materials}` : ""}`
        ).join("\n");
      }).join("\n\n");
    }

    const systemPrompt = `Tu es MerchandiserGPT, l'assistant personnel de ${settings?.userName || "Guillaume"}, merchandiser chez Mars en Belgique (zone: ${settings?.userZone || "Bruxelles"}).

Tu connais parfaitement le métier de merchandiser Mars: gestion des rayons, remplissage produits, facing, gestion des meubles (halfmoon, clipstrips, etc.), relations avec les Sales reps, etc.

AUJOURD'HUI: ${todayStr}

GLOSSAIRE MÉTIER MARS:
${glossaryText}

PLANNING EN COURS:
${planningText}

MODIFICATIONS RÉCENTES APPLIQUÉES:
${modsText}

Réponds en français, de façon concise et utile. Tu as accès à tout le contexte du planning, donc tu peux répondre à des questions spécifiques sur les magasins, les Sales reps, les remarques, etc.`;

    const openai = new OpenAI({ apiKey });
    const recentMessages = messages.slice(-20);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...recentMessages,
      ],
      temperature: 0.7,
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
    });
  } catch (error) {
    return errorResponse(error, "POST /api/chat");
  }
}