import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MATERIAL_TYPES: { name: string; category: string }[] = [
  { name: "TG star", category: "snacking" },
  { name: "Butter", category: "snacking" },
  { name: "Halfmoon", category: "snacking" },
  { name: "Modulair", category: "snacking" },
  { name: "Accroche", category: "snacking" },
  { name: "Choco boutique", category: "snacking" },
  { name: "Colorworks", category: "snacking" },
  { name: "S180", category: "snacking" },
  { name: "Self check out 3 layer display", category: "snacking" },
  { name: "BE KIND single tower & metal HP tower", category: "snacking" },
  { name: "BE KIND 3 layer display", category: "snacking" },
  { name: "Plastic box & wooden box", category: "snacking" },
  { name: "Display", category: "snacking" },
  { name: "Arch", category: "snacking" },
  { name: "Totem", category: "snacking" },
  { name: "Standee", category: "snacking" },
  { name: "Pop up", category: "snacking" },
  { name: "Storbak/dumbbin display/flexi", category: "snacking" },
  { name: "Big wobbler (totem, arch, display)", category: "snacking" },
  { name: "Small wobbler (shelf)", category: "snacking" },
  { name: "Small & big freezer", category: "snacking" },
  { name: "Arch (Pet)", category: "food-pet" },
  { name: "Totem (Pet)", category: "food-pet" },
  { name: "Caisse & Treat Furniture", category: "food-pet" },
  { name: "Wobbler in shelf", category: "food-pet" },
  { name: "Dumpbins & Free sample wobbler", category: "food-pet" },
  { name: "Special flexis", category: "food-pet" },
  { name: "Flexi Whiskas", category: "food-pet" },
  { name: "Flexi Sheba & Catisfactions", category: "food-pet" },
  { name: "Display (Pet)", category: "food-pet" },
  { name: "Display & Totem", category: "food-pet" },
  { name: "Flexis + totem + arch", category: "food-pet" },
];

export async function GET() {
  try {
    const existing = await prisma.materialGuide.findMany();
    const byName = Object.fromEntries(existing.map((e) => [e.name, e]));

    const result = MATERIAL_TYPES.map((t) => ({
      name: t.name,
      category: t.category,
      photoUrl: byName[t.name]?.photoUrl ?? null,
      blobKey: byName[t.name]?.blobKey ?? null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
