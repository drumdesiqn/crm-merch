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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/stores">
            <Button variant="outline" size="icon" aria-label="Retour">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{storeData.storeName}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>{storeData.storeAddress}, {storeData.storeZipcode} {storeData.storeCity}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenEdit} variant="outline" className="gap-2">
            <Pencil className="w-4 h-4" />
            Modifier
          </Button>
          <Button onClick={exportHistory} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-slate-900 border-blue-100 dark:border-blue-900">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.totalVisits}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total visites</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-slate-900 border-green-100 dark:border-green-900">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.completedVisits}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Terminées</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/50 dark:to-slate-900 border-yellow-100 dark:border-yellow-900">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingVisits}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">À faire</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/50 dark:to-slate-900 border-purple-100 dark:border-purple-900">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.totalNotes}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Notes</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/50 dark:to-slate-900 border-pink-100 dark:border-pink-900">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-pink-700 dark:text-pink-400">{stats.totalPhotos}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Photos</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/50 dark:to-slate-900 border-orange-100 dark:border-orange-900">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.materialTypes.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Types matériel</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              Filtres
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-slate-500 dark:text-slate-400"
            >
              {showFilters ? "Masquer" : "Afficher"}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Statut</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-mars"
                >
                  <option value="all">Tous</option>
                  <option value="pending">À faire</option>
                  <option value="done">Terminé</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-mars"
                >
                  <option value="all">Tous</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Ad Hoc">Ad Hoc</option>
                </select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Timeline */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Historique des visites ({filteredVisits.length})
        </h2>
        
        {filteredVisits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Aucune visite trouvée</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Modifie les filtres ou importe un planning pour voir les visites</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredVisits.map((visit) => (
              <Card key={visit.id} className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/planning/${visit.id}`}>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-mars dark:hover:text-blue-cpm transition-colors">
                            {formatDate(visit.visitDate)}
                          </h3>
                        </Link>
                        <Badge variant={visit.status === "done" ? "default" : "secondary"} className="text-xs">
                          {visit.status === "done" ? "Terminé" : "À faire"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {visit.visitType}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{visit.week.label}</p>
                    </div>
                    <Link href={`/planning/${visit.id}`}>
                      <Button variant="ghost" size="icon" aria-label="Voir la visite">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>

                  {visit.remarks && (
                    <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{visit.remarks}</p>
                    </div>
                  )}

                  {visit.materials && (
                    <div className="mb-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
                      <BarChart3 className="w-4 h-4" />
                      <span>{visit.materials}</span>
                      {visit.materialType && visit.materialType.split(", ").filter(Boolean).map((type, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                  )}

                  {(visit.notes?.length || 0) > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Notes ({visit.notes?.length || 0})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(visit.notes || []).slice(0, 2).map((note) => (
                          <div key={note.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm text-slate-600 dark:text-slate-400">
                            {note.content}
                          </div>
                        ))}
                        {(visit.notes?.length || 0) > 2 && (
                          <p className="text-xs text-slate-400">+{(visit.notes?.length || 0) - 2} note(s) supplémentaire(s)</p>
                        )}
                      </div>
                    </div>
                  )}

                  {(visit.photos?.length || 0) > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Photos ({visit.photos?.length || 0})
                        </span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {(visit.photos || []).slice(0, 4).map((photo) => (
                          <Image
                            key={photo.id}
                            src={photo.url}
                            alt={photo.caption || "Photo"}
                            width={80}
                            height={80}
                            className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                          />
                        ))}
                        {(visit.photos?.length || 0) > 4 && (
                          <div className="w-20 h-20 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-500">
                            +{(visit.photos?.length || 0) - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit store modal */}
      {showEditStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowEditStore(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Modifier {storeData?.storeName}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom *</label>
                <input
                  type="text"
                  value={editForm.storeName}
                  onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adresse *</label>
                <input
                  type="text"
                  value={editForm.storeAddress}
                  onChange={(e) => setEditForm({ ...editForm, storeAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code postal *</label>
                  <input
                    type="text"
                    value={editForm.storeZipcode}
                    onChange={(e) => setEditForm({ ...editForm, storeZipcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ville *</label>
                  <input
                    type="text"
                    value={editForm.storeCity}
                    onChange={(e) => setEditForm({ ...editForm, storeCity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Représentant</label>
                <input
                  type="text"
                  value={editForm.salesRep}
                  onChange={(e) => setEditForm({ ...editForm, salesRep: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base text-slate-900 dark:text-slate-100"
                  placeholder="Nom du représentant"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
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
