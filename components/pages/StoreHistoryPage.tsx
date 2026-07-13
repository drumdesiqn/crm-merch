"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, MapPin, Calendar, Download, Filter, ChevronRight, Image as ImageIcon, FileText, BarChart3, Pencil, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { fetchApi } from "@/lib/client-api";
import { useQueryClient } from "@tanstack/react-query";
import { useStoreHistoryPage } from "@/lib/hooks/useStoreHistoryPage";
import { StoreHistorySkeleton } from "@/components/Skeleton";

export default function StoreHistoryPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const queryClient = useQueryClient();

  const { data: storeData, isLoading: loading } = useStoreHistoryPage(storeId);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showEditStore, setShowEditStore] = useState(false);
  const [editForm, setEditForm] = useState({ storeName: "", storeAddress: "", storeZipcode: "", storeCity: "", visitType: "", assortment: "", visitFrequence: "", salesRep: "" });
  const [savingStore, setSavingStore] = useState(false);

  const handleOpenEdit = () => {
    if (!storeData) return;
    const lastVisit = storeData.visits[0];
    setEditForm({
      storeName: storeData.storeName,
      storeAddress: storeData.storeAddress,
      storeZipcode: storeData.storeZipcode,
      storeCity: storeData.storeCity,
      visitType: lastVisit?.visitType || "",
      assortment: lastVisit?.assortment || "",
      visitFrequence: lastVisit?.visitFrequence || "",
      salesRep: lastVisit?.salesRep || "",
    });
    setShowEditStore(true);
  };

  const handleUpdateStore = async () => {
    if (!storeData) return;
    setSavingStore(true);
    try {
      await fetchApi("/api/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          storeName: editForm.storeName.trim(),
          storeAddress: editForm.storeAddress.trim(),
          storeZipcode: editForm.storeZipcode.trim(),
          storeCity: editForm.storeCity.trim(),
          salesRep: editForm.salesRep.trim() || null,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["store-history-page", storeId] });
      setShowEditStore(false);
    } catch {
      // error handled by fetchApi toast
    } finally {
      setSavingStore(false);
    }
  };

  const filteredVisits = storeData?.visits.filter((visit) => {
    if (filterStatus !== "all" && visit.status !== filterStatus) return false;
    if (filterType !== "all" && visit.visitType !== filterType) return false;
    return true;
  }) || [];

  const stats = storeData ? {
    totalVisits: storeData.visits.length,
    completedVisits: storeData.visits.filter((v) => v.status === "done").length,
    pendingVisits: storeData.visits.filter((v) => v.status === "pending").length,
    totalNotes: storeData.visits.reduce((sum, v) => sum + (v.notes?.length || 0), 0),
    totalPhotos: storeData.visits.reduce((sum, v) => sum + (v.photos?.length || 0), 0),
    lastVisit: storeData.visits[0]?.visitDate || null,
    firstVisit: storeData.visits[storeData.visits.length - 1]?.visitDate || null,
    materialTypes: Array.from(new Set(storeData.visits.flatMap((v) => v.materialType ? v.materialType.split(", ") : []).filter(Boolean))),
  } : null;

  const exportHistory = async () => {
    if (!storeData) return;

    const XLSX = await import("xlsx");

    const exportData = storeData.visits.map((visit) => ({
      Date: formatDate(visit.visitDate),
      Semaine: visit.week.label,
      Type: visit.visitType,
      Statut: visit.status,
      Remarques: visit.remarks || "",
      Matériel: visit.materials || "",
      "Type Matériel": visit.materialType || "",
      Notes: (visit.notes || []).map((n) => n.content).join("; "),
      "Nombre Photos": (visit.photos || []).length,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historique");
    XLSX.writeFile(wb, `historique-${storeData.storeName.replace(/\s+/g, "-")}.xlsx`);
  };

  if (loading) {
    return <StoreHistorySkeleton />;
  }

  if (!storeData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/stores">
            <Button variant="outline" size="icon" aria-label="Retour">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Magasin non trouvé</h1>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#222223] text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-cpm";
  const labelCls = "block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div>
        <Link href="/stores" className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Magasins
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-0.5">
              {storeData.storeCity}
            </p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 leading-tight">{storeData.storeName}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <p className="text-xs text-slate-500 dark:text-zinc-400">{storeData.storeAddress}, {storeData.storeZipcode} {storeData.storeCity}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleOpenEdit}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#222223] transition-colors" title="Modifier">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={exportHistory}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#222223] transition-colors" title="Exporter Excel">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: stats.totalVisits, label: "Visites", accent: "border-l-teal-cpm" },
            { value: stats.completedVisits, label: "Terminées", accent: "border-l-green-cpm" },
            { value: stats.pendingVisits, label: "À faire", accent: "border-l-amber-400" },
            { value: stats.totalNotes, label: "Notes", accent: "border-l-slate-400" },
            { value: stats.totalPhotos, label: "Photos", accent: "border-l-slate-400" },
            { value: stats.materialTypes.length, label: "Matériels", accent: "border-l-teal-cpm" },
          ].map(({ value, label, accent }) => (
            <div key={label} className={`bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] border-l-4 ${accent} rounded-xl px-3 py-2.5`}>
              <p className="text-xl font-bold text-slate-900 dark:text-zinc-100">{value}</p>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters — inline */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-teal-cpm">
          <option value="all">Tous les statuts</option>
          <option value="pending">À faire</option>
          <option value="done">Terminé</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-teal-cpm">
          <option value="all">Tous les types</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Ad Hoc">Ad Hoc</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Historique</h2>
          <span className="text-xs text-slate-400 dark:text-zinc-500">({filteredVisits.length})</span>
        </div>

        {filteredVisits.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#222223] flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 dark:text-zinc-300">Aucune visite trouvée</p>
            <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">Modifie les filtres ou importe un planning</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVisits.map((visit) => (
              <div key={visit.id} className="flex items-stretch gap-0 rounded-xl border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] hover:border-slate-300 dark:hover:border-[#3a3a3c] transition-colors">
                {/* Status accent */}
                <div className={`w-1 rounded-l-xl shrink-0 ${
                  visit.status === "done" ? "bg-green-cpm" :
                  visit.status === "cancelled" ? "bg-red-400" : "bg-amber-400"
                }`} />
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 capitalize">{formatDate(visit.visitDate)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          visit.status === "done" ? "bg-green-cpm/10 dark:bg-green-cpm/15 text-green-cpm" :
                          "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                        }`}>{visit.status === "done" ? "Terminé" : "À faire"}</span>
                        <span className="text-xs text-slate-400 dark:text-zinc-500">{visit.visitType}</span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{visit.week.label}</p>
                    </div>
                    <Link href={`/planning/${visit.id}`} className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 dark:text-zinc-600 hover:text-teal-cpm transition-colors shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {visit.remarks && (
                    <div className="mt-2 px-2.5 py-2 bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/40 rounded-lg">
                      <p className="text-xs text-amber-900 dark:text-amber-300">{visit.remarks}</p>
                    </div>
                  )}

                  {visit.materials && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <BarChart3 className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-600 dark:text-zinc-400">{visit.materials}</span>
                      {visit.materialType && visit.materialType.split(", ").filter(Boolean).map((type, idx) => (
                        <span key={idx} className="text-xs px-1.5 py-0.5 rounded bg-teal-cpm/10 dark:bg-teal-cpm/15 text-teal-cpm">{type}</span>
                      ))}
                    </div>
                  )}

                  {((visit.notes?.length || 0) > 0 || (visit.photos?.length || 0) > 0) && (
                    <div className="mt-2 flex items-center gap-3">
                      {(visit.notes?.length || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-500 dark:text-zinc-400">{visit.notes?.length} note{(visit.notes?.length || 0) > 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {(visit.photos?.length || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-500 dark:text-zinc-400">{visit.photos?.length} photo{(visit.photos?.length || 0) > 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {(visit.photos?.length || 0) > 0 && (
                    <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                      {(visit.photos || []).slice(0, 5).map((photo) => (
                        <Image key={photo.id} src={photo.url} alt={photo.caption || "Photo"} width={64} height={64}
                          className="w-14 h-14 object-cover rounded-lg border border-slate-100 dark:border-[#2e2e30] shrink-0" />
                      ))}
                      {(visit.photos?.length || 0) > 5 && (
                        <div className="w-14 h-14 flex items-center justify-center bg-slate-100 dark:bg-[#222223] rounded-lg border border-slate-200 dark:border-[#2e2e30] text-xs text-slate-500 dark:text-zinc-400 shrink-0">
                          +{(visit.photos?.length || 0) - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit store modal */}
      {showEditStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditStore(false)}>
          <div className="bg-white dark:bg-[#1a1a1b] rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Modifier {storeData?.storeName}</h2>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Nom *</label>
                <input
                  type="text"
                  value={editForm.storeName}
                  onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Adresse *</label>
                <input
                  type="text"
                  value={editForm.storeAddress}
                  onChange={(e) => setEditForm({ ...editForm, storeAddress: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className={labelCls}>CP *</label>
                  <input
                    type="text"
                    value={editForm.storeZipcode}
                    onChange={(e) => setEditForm({ ...editForm, storeZipcode: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="flex-[2]">
                  <label className={labelCls}>Ville *</label>
                  <input
                    type="text"
                    value={editForm.storeCity}
                    onChange={(e) => setEditForm({ ...editForm, storeCity: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Représentant</label>
                <input
                  type="text"
                  value={editForm.salesRep}
                  onChange={(e) => setEditForm({ ...editForm, salesRep: e.target.value })}
                  className={inputCls}
                  placeholder="Nom du représentant"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleUpdateStore} disabled={savingStore}>
                {savingStore ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowEditStore(false)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
