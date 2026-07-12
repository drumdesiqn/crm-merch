"use client";

import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMaterialTypesByCategory } from "@/lib/constants";

const MATERIAL_TYPES = getMaterialTypesByCategory();

function getMaterialTypes(assortment: string | null | undefined): string[] {
  const key = (assortment || "").toLowerCase();
  if (key.includes("snacking")) return MATERIAL_TYPES.snacking || [];
  if (key.includes("food") || key.includes("pet") || key.includes("nutrition")) return MATERIAL_TYPES["food-pet"] || [];
  // Default: show all types (both snacking + food-pet)
  return [...(MATERIAL_TYPES.snacking || []), ...(MATERIAL_TYPES["food-pet"] || [])];
}

interface MaterialTypeSelectorProps {
  assortment: string;
  value: string[];
  saving: boolean;
  onChange: (v: string[]) => void;
}

export default function MaterialTypeSelector({
  assortment, value, saving, onChange,
}: MaterialTypeSelectorProps) {
  const types = getMaterialTypes(assortment);

  const toggleType = (type: string) => {
    if (value.includes(type)) {
      onChange(value.filter((t) => t !== type));
    } else {
      onChange([...value, type]);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-teal-cpm" /> Type de matériel installé
          </span>
          {saving && <span className="text-xs text-slate-400 font-normal animate-pulse">Sauvegarde...</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                value.includes(t)
                  ? "bg-teal-cpm text-white border-teal-cpm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-teal-cpm hover:text-teal-cpm"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {value.length > 0 && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Sélectionné : <span className="font-medium text-teal-cpm">{value.join(", ")}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
