"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MapPin } from "lucide-react";
import { VISIT_TYPE_COLORS } from "@/lib/utils";
import { formatKm, formatDuration } from "./route-helpers";
import type { GeocodedVisit } from "./types";

export function SortableVisitItem({
  visit,
  index,
  geocoding,
  legInfo,
  onEditAddress,
}: {
  visit: GeocodedVisit;
  index: number;
  geocoding: boolean;
  legInfo: { distance: number; duration: number } | null;
  onEditAddress?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: visit.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const typeColor = VISIT_TYPE_COLORS[visit.visitType] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div>
      {legInfo && (
        <div className="flex items-center gap-2 py-1 pl-10">
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            ↓ {formatKm(legInfo.distance)} · {formatDuration(legInfo.duration)}
          </span>
        </div>
      )}
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-slate-800 transition-shadow ${
          isDragging ? "shadow-lg border-blue-cpm dark:border-blue-700" : "border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
        }`}
      >
      <button
        {...attributes}
        {...listeners}
        className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Déplacer"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          visit.coords ? "bg-blue-mars text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
        }`}
      >
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{visit.storeName}</p>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {visit.storeAddress}, {visit.storeZipcode} {visit.storeCity}
          </p>
        </div>
      </div>

      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${typeColor}`}>
        {visit.visitType}
      </span>

      {!geocoding && onEditAddress && (
        <button
          onClick={onEditAddress}
          className={`text-xs shrink-0 px-1.5 py-0.5 rounded border transition-colors ${
            !visit.coords
              ? "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              : "text-slate-400 dark:text-slate-500 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
          title="Modifier l'adresse"
        >
          ✏️
        </button>
      )}
      </div>
    </div>
  );
}
