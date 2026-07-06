"use client";

import { useState } from "react";
import { useSessionState } from "@/lib/hooks/useSessionState";
import Link from "next/link";
import { ArrowLeft, Store, MapPin, Calendar, TrendingUp, Search, ChevronRight, Loader2, Plus, CalendarPlus, Pencil, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useStores } from "@/lib/hooks/useStores";
import { useCreateStore } from "@/lib/hooks/useCreateStore";
import { useCreateVisit } from "@/lib/hooks/useCreateVisit";
import { useUpdateStore } from "@/lib/hooks/useUpdateStore";
import { showToast } from "@/components/Toast";
import { StoresListSkeleton } from "@/components/Skeleton";
import FrenchDatePicker from "@/components/FrenchDatePicker";

const emptyStore = {
  storeId: "",
  storeName: "",
  storeAddress: "",
  storeZipcode: "",
  storeCity: "",
  assortment: "",
  visitType: "Maintenance",
  visitFrequence: null as string | null,
  salesRep: null as string | null,
};

export default function StoresPage() {
  const [searchQuery, setSearchQuery] = useSessionState("stores-search", "");
  const [sortBy, setSortBy] = useSessionState("stores-sort", "name");
  const [sortOrder, setSortOrder] = useSessionState<"asc" | "desc">("stores-order", "asc");
  const [filterCity, setFilterCity] = useSessionState("stores-city", "");
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [storeForm, setStoreForm] = useState({ ...emptyStore });
  const [showPlanForm, setShowPlanForm] = useState<string | null>(null);
  const [planDate, setPlanDate] = useState("");
  const [planStore, setPlanStore] = useState<typeof emptyStore | null>(null);
  const [planSalesRep, setPlanSalesRep] = useState("");
  const [planRemarks, setPlanRemarks] = useState("");
  const [editingStore, setEditingStore] = useState<typeof emptyStore | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyStore });

  const { data: stores = [], isLoading: loading, isFetching } = useStores();
  const createStore = useCreateStore();
  const createVisit = useCreateVisit();
  const updateStore = useUpdateStore();

  const handleCreateStore = async () => {
    if (!storeForm.storeId.trim() || !storeForm.storeName.trim() || !storeForm.storeAddress.trim() || !storeForm.storeCity.trim()) {
      showToast("error", "Veuillez remplir les champs obligatoires");
      return;
    }
    try {
      await createStore.mutateAsync({
        storeId: storeForm.storeId.trim(),
        storeName: storeForm.storeName.trim(),
        storeAddress: storeForm.storeAddress.trim(),
        storeZipcode: storeForm.storeZipcode.trim(),
        storeCity: storeForm.storeCity.trim(),
        assortment: storeForm.assortment.trim(),
        visitType: storeForm.visitType.trim(),
        visitFrequence: storeForm.visitFrequence?.trim() || null,
        salesRep: storeForm.salesRep?.trim() || null,
      });
      showToast("success", "Magasin créé");
      setStoreForm({ ...emptyStore });
      setShowStoreForm(false);
    } catch {
      showToast("error", "Erreur lors de la création du magasin");
    }
  };

  const handleEdit = (store: typeof emptyStore) => {
    setEditingStore(store);
    setEditForm({ ...store });
  };

  const handleUpdateStore = async () => {
    if (!editingStore) return;
    try {
      await updateStore.mutateAsync({
        storeId: editingStore.storeId,
        storeName: editForm.storeName.trim(),
        storeAddress: editForm.storeAddress.trim(),
        storeZipcode: editForm.storeZipcode.trim(),
        storeCity: editForm.storeCity.trim(),
        assortment: editForm.assortment.trim(),
        visitType: editForm.visitType.trim(),
        visitFrequence: editForm.visitFrequence?.trim() || null,
        salesRep: editForm.salesRep?.trim() || null,
      });
      showToast("success", "Magasin mis à jour");
      setEditingStore(null);
    } catch {
      showToast("error", "Erreur lors de la modification");
    }
  };

  const handlePlan = (store: typeof emptyStore) => {
    setPlanStore(store);
    setShowPlanForm(store.storeId);
    const today = new Date().toISOString().split("T")[0];
    setPlanDate(today);
    setPlanSalesRep("");
    setPlanRemarks("");
  };

  const handleCreateVisit = async () => {
    if (!planStore || !planDate) return;
    try {
      await createVisit.mutateAsync({
        storeId: planStore.storeId,
        visitDate: planDate,
        visitType: planStore.visitType,
        assortment: planStore.assortment,
        salesRep: planSalesRep.trim() || null,
        remarks: planRemarks.trim() || null,
      });
      showToast("success", "Magasin planifié");
      setShowPlanForm(null);
      setPlanStore(null);
      setPlanDate("");
      setPlanSalesRep("");
      setPlanRemarks("");
    } catch {
      showToast("error", "Erreur lors de la planification");
    }
  };

  const cities = Array.from(new Set(stores.map((s) => s.storeCity).filter(Boolean))).sort();

  const filteredStores = stores.filter((store) => {
    const matchSearch =
      store.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.storeCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.storeAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCity = filterCity === "" || store.storeCity === filterCity;
    return matchSearch && matchCity;
  });

  if (loading) {
    return <StoresListSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" aria-label="Retour">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Magasins</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              {stores.length} magasin{stores.length !== 1 ? "s" : ""} visité{stores.length !== 1 ? "s" : ""}
              {isFetching && <Loader2 className="w-3 h-3 animate-spin" />}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowStoreForm(true)} className="shrink-0" aria-label="Ajouter magasin">
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un magasin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-mars text-base"
                aria-label="Rechercher un magasin"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-mars"
              >
                <option value="name">Nom</option>
                <option value="city">Ville</option>
                <option value="visits">Visites</option>
                <option value="lastVisit">Dernière visite</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
            {cities.length > 1 && (
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-mars"
              >
                <option value="">Toutes les villes</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats — uniquement les stats propres à la liste magasins */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-slate-900 border-blue-100 dark:border-blue-900">
          <CardContent className="py-3 sm:py-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400">{stores.filter((s) => s.totalVisits > 0).length}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">Magasins actifs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-mars-light to-white dark:from-blue-mars/20 dark:to-slate-900 border-blue-200 dark:border-blue-800">
          <CardContent className="py-3 sm:py-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-blue-mars dark:text-blue-cpm">
              {stores.filter((s) => s.materialTypes.length > 0).length}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">Avec matériel installé</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Link href="/analytics" className="text-xs text-blue-mars hover:underline flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Voir les stats globales dans Analytics
        </Link>
      </div>

      {/* Stores list + count */}
      {(searchQuery || filterCity) && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {filteredStores.length} résultat{filteredStores.length !== 1 ? "s" : ""} sur {stores.length}
        </p>
      )}
      <div className="grid gap-2 sm:gap-3">
        {filteredStores.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun magasin trouvé</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Les magasins apparaissent automatiquement après import du planning</p>
            </CardContent>
          </Card>
        ) : (
          filteredStores.map((store) => (
            <Link key={store.storeId} href={`/stores/${store.storeId}/history`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 dark:border-slate-700">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight">
                          {store.storeName}
                        </h3>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0 mt-0.5">
                          {store.totalVisits} visite{store.totalVisits !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePlan(store); }}
                        >
                          <CalendarPlus className="w-3 h-3 mr-1" /> Planifier
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-slate-500"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(store); }}
                        >
                          <Pencil className="w-3 h-3 mr-1" /> Modifier
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-2">
                        <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                        <span className="truncate">
                          {store.storeAddress}, {store.storeZipcode} {store.storeCity}
                        </span>
                      </div>
                      {store.salesRep && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{store.salesRep}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span className="truncate">{store.lastVisit ? formatDate(store.lastVisit) : "—"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>
                            {store.completedVisits}/{store.totalVisits}
                          </span>
                        </div>
                        {store.totalPhotos > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-blue-mars dark:text-blue-cpm font-medium">
                              {store.totalPhotos} photo{store.totalPhotos !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                      {store.materialTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {store.materialTypes.slice(0, 3).map((type) => (
                            <Badge key={type} className="text-[10px] sm:text-xs bg-blue-mars-light text-blue-mars dark:bg-blue-mars/20 dark:text-blue-cpm border-blue-200 dark:border-blue-800">
                              {type}
                            </Badge>
                          ))}
                          {store.materialTypes.length > 3 && (
                            <Badge className="text-[10px] sm:text-xs bg-blue-mars-light text-blue-mars dark:bg-blue-mars/20 dark:text-blue-cpm border-blue-200 dark:border-blue-800">
                              +{store.materialTypes.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Create store modal */}
      {showStoreForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowStoreForm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ajouter un magasin</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ID magasin *</label>
                <input
                  type="text"
                  value={storeForm.storeId}
                  onChange={(e) => setStoreForm({ ...storeForm, storeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                  placeholder="Ex: BRU001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom *</label>
                <input
                  type="text"
                  value={storeForm.storeName}
                  onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                  placeholder="Ex: Carrefour Express Bruxelles"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adresse *</label>
                <input
                  type="text"
                  value={storeForm.storeAddress}
                  onChange={(e) => setStoreForm({ ...storeForm, storeAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                  placeholder="Ex: Rue de la Loi 1"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code postal *</label>
                  <input
                    type="text"
                    value={storeForm.storeZipcode}
                    onChange={(e) => setStoreForm({ ...storeForm, storeZipcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                    placeholder="1000"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ville *</label>
                  <input
                    type="text"
                    value={storeForm.storeCity}
                    onChange={(e) => setStoreForm({ ...storeForm, storeCity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                    placeholder="Bruxelles"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type de visite</label>
                <input
                  type="text"
                  value={storeForm.visitType}
                  onChange={(e) => setStoreForm({ ...storeForm, visitType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assortiment</label>
                <input
                  type="text"
                  value={storeForm.assortment}
                  onChange={(e) => setStoreForm({ ...storeForm, assortment: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fréquence</label>
                <input
                  type="text"
                  value={storeForm.visitFrequence || ""}
                  onChange={(e) => setStoreForm({ ...storeForm, visitFrequence: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                  placeholder="Ex: Hebdomadaire"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Représentant</label>
                <input
                  type="text"
                  value={storeForm.salesRep || ""}
                  onChange={(e) => setStoreForm({ ...storeForm, salesRep: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                  placeholder="Nom du représentant"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleCreateStore} disabled={createStore.isPending}>
                {createStore.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowStoreForm(false)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Plan visit modal */}
      {showPlanForm && planStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPlanForm(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-4 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Planifier {planStore.storeName}</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date de visite</label>
              <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-3">
                <FrenchDatePicker value={planDate} onChange={setPlanDate} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Représentant</label>
              <input
                type="text"
                value={planSalesRep}
                onChange={(e) => setPlanSalesRep(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                placeholder="Nom du représentant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <textarea
                value={planRemarks}
                onChange={(e) => setPlanRemarks(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base resize-none"
                placeholder="Remarques, instructions..."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleCreateVisit} disabled={createVisit.isPending}>
                {createVisit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Planifier"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowPlanForm(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit store modal */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditingStore(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Modifier {editingStore.storeName}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom *</label>
                <input
                  type="text"
                  value={editForm.storeName}
                  onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adresse *</label>
                <input
                  type="text"
                  value={editForm.storeAddress}
                  onChange={(e) => setEditForm({ ...editForm, storeAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code postal *</label>
                  <input
                    type="text"
                    value={editForm.storeZipcode}
                    onChange={(e) => setEditForm({ ...editForm, storeZipcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ville *</label>
                  <input
                    type="text"
                    value={editForm.storeCity}
                    onChange={(e) => setEditForm({ ...editForm, storeCity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type de visite</label>
                <input
                  type="text"
                  value={editForm.visitType}
                  onChange={(e) => setEditForm({ ...editForm, visitType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assortiment</label>
                <input
                  type="text"
                  value={editForm.assortment}
                  onChange={(e) => setEditForm({ ...editForm, assortment: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fréquence</label>
                <input
                  type="text"
                  value={editForm.visitFrequence || ""}
                  onChange={(e) => setEditForm({ ...editForm, visitFrequence: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                  placeholder="Ex: Hebdomadaire"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Représentant</label>
                <input
                  type="text"
                  value={editForm.salesRep || ""}
                  onChange={(e) => setEditForm({ ...editForm, salesRep: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                  placeholder="Nom du représentant"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleUpdateStore} disabled={updateStore.isPending}>
                {updateStore.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditingStore(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
