"use client";

import Image from "next/image";
import Link from "next/link";
import { Wrench, StickyNote, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { VISIT_TYPE_COLORS, formatDateShort } from "@/lib/utils";
import type { StoreHistoryVisit } from "@/types/visit";

interface VisitHistoryProps {
  history: StoreHistoryVisit[];
  historyLoaded: boolean;
  storeName: string;
}

export default function VisitHistory({ history, historyLoaded, storeName }: VisitHistoryProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Toutes les visites précédentes à <strong>{storeName}</strong>
      </p>

      {!historyLoaded && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-blue-mars border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {historyLoaded && history.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          Aucune autre visite enregistrée pour ce magasin.
        </div>
      )}

      {history.map((v) => {
        const hTypeColor = VISIT_TYPE_COLORS[v.visitType] || "bg-slate-100 text-slate-700 border-slate-200";
        return (
          <Link key={v.id} href={`/planning/${v.id}`}>
            <Card className="hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {formatDateShort(v.visitDate)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${hTypeColor}`}>
                        {v.visitType}
                      </span>
                      <span className="text-xs text-slate-400">{v.week.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {v.materialType && v.materialType.split(", ").filter(Boolean).map((type, idx) => (
                        <span key={idx} className="flex items-center gap-1 text-xs text-blue-mars bg-blue-mars-light dark:bg-blue-mars/20 px-2 py-0.5 rounded-full">
                          <Wrench className="w-3 h-3" /> {type}
                        </span>
                      ))}
                      {(v.notes?.length || 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <StickyNote className="w-3 h-3" /> {v.notes!.length} note{v.notes!.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {(v.photos?.length || 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <ImageIcon className="w-3 h-3" /> {v.photos!.length} photo{v.photos!.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {(v.notes?.length || 0) === 0 && (v.photos?.length || 0) === 0 && (!v.materialType || v.materialType.length === 0) && (
                        <span className="text-xs text-slate-300">Aucune note</span>
                      )}
                    </div>
                    {/* Preview first note */}
                    {v.notes?.[0] && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic">&ldquo;{v.notes[0].content}&rdquo;</p>
                    )}
                    {/* Preview photos thumbnails */}
                    {(v.photos?.length || 0) > 0 && (
                      <div className="flex gap-1 mt-2">
                        {v.photos!.slice(0, 4).map((p) => (
                          <div key={p.id} className="relative w-10 h-10 rounded overflow-hidden bg-slate-100 shrink-0">
                            <Image src={p.url} alt="" fill className="object-cover" sizes="40px" />
                          </div>
                        ))}
                        {v.photos!.length > 4 && (
                          <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                            +{v.photos!.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
