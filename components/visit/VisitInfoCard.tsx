"use client";

import { useState, useEffect } from "react";
import { Calendar, MapPin, User, Tag, Package, AlertCircle, Wrench, ExternalLink, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Visit } from "@/types/visit";

type VisitInfoFields = Pick<Visit, "storeAddress" | "storeZipcode" | "storeCity" | "visitDate" | "salesRep" | "visitFrequence" | "merchandiser" | "remarks" | "materials">;

interface VisitInfoCardProps {
  visit: VisitInfoFields;
  mapsUrl: string;
  wazeUrl: string;
  onUpdate?: (fields: { salesRep?: string | null; remarks?: string | null }) => Promise<void>;
}

export default function VisitInfoCard({ visit, mapsUrl, wazeUrl, onUpdate }: VisitInfoCardProps) {
  const [editingSalesRep, setEditingSalesRep] = useState(false);
  const [salesRepValue, setSalesRepValue] = useState(visit.salesRep || "");
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [remarksValue, setRemarksValue] = useState(visit.remarks || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!editingSalesRep) setSalesRepValue(visit.salesRep || ""); }, [visit.salesRep, editingSalesRep]);
  useEffect(() => { if (!editingRemarks) setRemarksValue(visit.remarks || ""); }, [visit.remarks, editingRemarks]);

  const saveSalesRep = async () => {
    if (!onUpdate) return;
    setSaving(true);
    await onUpdate({ salesRep: salesRepValue.trim() || null });
    setSaving(false);
    setEditingSalesRep(false);
  };

  const saveRemarks = async () => {
    if (!onUpdate) return;
    setSaving(true);
    await onUpdate({ remarks: remarksValue.trim() || null });
    setSaving(false);
    setEditingRemarks(false);
  };

  return (
    <>
      {/* Consolidated info card */}
      <Card>
        <CardContent className="py-3 space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-blue-mars shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Date de visite</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">{formatDate(visit.visitDate)}</p>
            </div>
          </div>
          <div className="h-px bg-slate-100 dark:bg-[#2e2e30]" />
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-blue-mars shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Adresse</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.storeAddress}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{visit.storeZipcode} {visit.storeCity}</p>
            </div>
          </div>
          <>
            <div className="h-px bg-slate-100 dark:bg-[#2e2e30]" />
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-blue-mars shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Sales Representative</p>
                {editingSalesRep ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      autoFocus
                      type="text"
                      value={salesRepValue}
                      onChange={(e) => setSalesRepValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveSalesRep(); if (e.key === "Escape") { setSalesRepValue(visit.salesRep || ""); setEditingSalesRep(false); } }}
                      className="flex-1 px-2 py-1 text-sm rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#222223] text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-mars"
                      placeholder="Nom du représentant"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={saveSalesRep} disabled={saving}><Check className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => { setSalesRepValue(visit.salesRep || ""); setEditingSalesRep(false); }}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.salesRep || <span className="text-slate-400 italic">Non renseigné</span>}</p>
                    {onUpdate && <button onClick={() => setEditingSalesRep(true)} className="text-slate-300 hover:text-blue-mars transition-colors"><Pencil className="w-3 h-3" /></button>}
                  </div>
                )}
              </div>
            </div>
          </>
          {visit.visitFrequence && (
            <>
              <div className="h-px bg-slate-100 dark:bg-[#2e2e30]" />
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-blue-mars shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Type / Fréquence</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.visitFrequence}</p>
                </div>
              </div>
            </>
          )}
          {visit.merchandiser && (
            <>
              <div className="h-px bg-slate-100 dark:bg-[#2e2e30]" />
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-blue-mars shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Merchandiser</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.merchandiser}</p>
                </div>
              </div>
            </>
          )}
          <div className="h-px bg-slate-100 dark:bg-[#2e2e30]" />
          <div className="flex gap-2 pt-1">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors">
              <ExternalLink className="w-4 h-4" /> Google Maps
            </a>
            <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-sm font-medium hover:bg-sky-100 dark:bg-sky-950/30 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-900/40 transition-colors">
              <ExternalLink className="w-4 h-4" /> Waze
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200/80 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/15">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm text-amber-800 dark:text-amber-400">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Remarques</div>
            {onUpdate && !editingRemarks && (
              <button onClick={() => setEditingRemarks(true)} className="text-orange-300 hover:text-orange-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-4">
          {editingRemarks ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={remarksValue}
                onChange={(e) => setRemarksValue(e.target.value)}
                rows={3}
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-[#222223] text-slate-900 dark:text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Remarques, instructions..."
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={saveRemarks} disabled={saving}>Enregistrer</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setRemarksValue(visit.remarks || ""); setEditingRemarks(false); }}>Annuler</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{visit.remarks || <span className="italic text-amber-400/80">Aucune remarque</span>}</p>
          )}
        </CardContent>
      </Card>

      {visit.materials && (
        <Card className="border-blue-100 dark:border-[#2e2e30]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
              <Wrench className="w-4 h-4" /> Matériel nécessaire
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <p className="text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">{visit.materials}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}