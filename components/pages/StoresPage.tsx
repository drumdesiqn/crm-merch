"use client";

import { useState } from "react";
import { useSessionState } from "@/lib/hooks/useSessionState";
import Link from "next/link";
import { Store, MapPin, Calendar, Search, ChevronRight, Loader2, Plus, CalendarPlus, Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#222223] text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-cpm";
  const labelCls = "block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide";
  const modalCls = "bg-white dark:bg-[#1a1a1b] rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">Réseau</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            Magasins
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </h1>
        </div>
        <Button size="sm" onClick={() => setShowStoreForm(true)} className="shrink-0" aria-label="Ajouter magasin">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un magasin, ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-cpm"
            aria-label="Rechercher un magasin"
          />
        </div>
        <div className="flex gap-2">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-teal-cpm">
            <option value="name">Trier par nom</option>
            <option value="city">Ville</option>
            <option value="visits">Visites</option>
            <option value="lastVisit">Dernière visite</option>
          </select>
          <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] text-slate-600 dark:text-zinc-400 text-sm hover:bg-slate-50 dark:hover:bg-[#222223] transition-colors">
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
          {cities.length > 1 && (
            <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-teal-cpm">
              <option value="">Toutes les villes</option>
              {cities.map((city) => (<option key={city} value={city}>{city}</option>))}
            </select>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] border-l-4 border-l-teal-cpm rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{stores.filter((s) => s.totalVisits > 0).length}</p>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">Magasins actifs</p>
        </div>
        <div className="bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] border-l-4 border-l-teal-cpm rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{stores.filter((s) => s.materialTypes.length > 0).length}</p>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">Avec matériel installé</p>
        </div>
      </div>

      {/* Result count */}
      {(searchQuery || filterCity) && (
        <p className="text-xs text-slate-400 dark:text-zinc-500">{filteredStores.length} / {stores.length} magasin{stores.length > 1 ? "s" : ""}</p>
      )}

      {/* Stores list */}
      <div className="space-y-2">
        {filteredStores.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#222223] flex items-center justify-center mx-auto mb-3">
              <Store className="w-5 h-5 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 dark:text-zinc-300">Aucun magasin trouvé</p>
            <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">Les magasins apparaissent automatiquement après import du planning</p>
          </div>
        ) : (
          filteredStores.map((store) => (
            <div key={store.storeId} className="group flex items-stretch gap-0 rounded-xl border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] hover:border-slate-300 dark:hover:border-[#3a3a3c] hover:shadow-sm transition-all">
              {/* Left accent based on completions */}
              <div className={`w-1 rounded-l-xl shrink-0 ${
                store.totalVisits === 0 ? "bg-slate-200 dark:bg-[#2e2e30]" :
                store.completedVisits === store.totalVisits ? "bg-green-cpm" : "bg-teal-cpm"
              }`} />
              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">{store.storeName}</p>
                      <span className="text-xs text-slate-400 dark:text-zinc-500 shrink-0">· {store.completedVisits}/{store.totalVisits}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{store.storeAddress}, {store.storeZipcode} {store.storeCity}</p>
                    </div>
                    {store.salesRep && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{store.salesRep}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {store.lastVisit && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400 dark:text-zinc-500">{formatDate(store.lastVisit)}</span>
                        </div>
                      )}
                      {store.totalPhotos > 0 && (
                        <span className="text-xs text-slate-400 dark:text-zinc-500">{store.totalPhotos} photo{store.totalPhotos > 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {store.materialTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {store.materialTypes.slice(0, 3).map((type) => (
                          <span key={type} className="text-xs px-1.5 py-0.5 rounded bg-teal-cpm/10 dark:bg-teal-cpm/15 text-teal-cpm font-medium">{type}</span>
                        ))}
                        {store.materialTypes.length > 3 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#222223] text-slate-500 dark:text-zinc-400">+{store.materialTypes.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePlan(store); }}
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-teal-cpm hover:bg-teal-cpm/10 dark:hover:bg-teal-cpm/15 transition-colors" title="Planifier">
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(store); }}
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#222223] transition-colors" title="Modifier">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <Link href={`/stores/${store.storeId}/history`} onClick={(e) => e.stopPropagation()}>
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 dark:text-zinc-600 hover:text-slate-500 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create store modal */}
      {showStoreForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowStoreForm(false)}>
          <div className={modalCls} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Ajouter un magasin</h2>
            <div className="space-y-3">
              <div><label className={labelCls}>ID magasin *</label><input type="text" value={storeForm.storeId} onChange={(e) => setStoreForm({ ...storeForm, storeId: e.target.value })} className={inputCls} placeholder="Ex: BRU001" /></div>
              <div><label className={labelCls}>Nom *</label><input type="text" value={storeForm.storeName} onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })} className={inputCls} placeholder="Ex: Carrefour Express Bruxelles" /></div>
              <div><label className={labelCls}>Adresse *</label><input type="text" value={storeForm.storeAddress} onChange={(e) => setStoreForm({ ...storeForm, storeAddress: e.target.value })} className={inputCls} placeholder="Ex: Rue de la Loi 1" /></div>
              <div className="flex gap-2">
                <div className="flex-1"><label className={labelCls}>CP *</label><input type="text" value={storeForm.storeZipcode} onChange={(e) => setStoreForm({ ...storeForm, storeZipcode: e.target.value })} className={inputCls} placeholder="1000" /></div>
                <div className="flex-[2]"><label className={labelCls}>Ville *</label><input type="text" value={storeForm.storeCity} onChange={(e) => setStoreForm({ ...storeForm, storeCity: e.target.value })} className={inputCls} placeholder="Bruxelles" /></div>
              </div>
              <div><label className={labelCls}>Type de visite</label><input type="text" value={storeForm.visitType} onChange={(e) => setStoreForm({ ...storeForm, visitType: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Assortiment</label><input type="text" value={storeForm.assortment} onChange={(e) => setStoreForm({ ...storeForm, assortment: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Fréquence</label><input type="text" value={storeForm.visitFrequence || ""} onChange={(e) => setStoreForm({ ...storeForm, visitFrequence: e.target.value || null })} className={inputCls} placeholder="Ex: Hebdomadaire" /></div>
              <div><label className={labelCls}>Représentant</label><input type="text" value={storeForm.salesRep || ""} onChange={(e) => setStoreForm({ ...storeForm, salesRep: e.target.value || null })} className={inputCls} placeholder="Nom du représentant" /></div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreateStore} disabled={createStore.isPending}>{createStore.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer"}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowStoreForm(false)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Plan visit modal */}
      {showPlanForm && planStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlanForm(null)}>
          <div className="bg-white dark:bg-[#1a1a1b] rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Planifier {planStore.storeName}</h2>
            <div>
              <label className={labelCls}>Date de visite</label>
              <div className="border border-slate-200 dark:border-[#2e2e30] rounded-lg p-3 bg-white dark:bg-[#222223]">
                <FrenchDatePicker value={planDate} onChange={setPlanDate} />
              </div>
            </div>
            <div><label className={labelCls}>Représentant</label><input type="text" value={planSalesRep} onChange={(e) => setPlanSalesRep(e.target.value)} className={inputCls} placeholder="Nom du représentant" /></div>
            <div><label className={labelCls}>Notes</label><textarea value={planRemarks} onChange={(e) => setPlanRemarks(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Remarques, instructions..." /></div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreateVisit} disabled={createVisit.isPending}>{createVisit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Planifier"}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowPlanForm(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit store modal */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingStore(null)}>
          <div className={modalCls} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Modifier {editingStore.storeName}</h2>
            <div className="space-y-3">
              <div><label className={labelCls}>Nom *</label><input type="text" value={editForm.storeName} onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Adresse *</label><input type="text" value={editForm.storeAddress} onChange={(e) => setEditForm({ ...editForm, storeAddress: e.target.value })} className={inputCls} /></div>
              <div className="flex gap-2">
                <div className="flex-1"><label className={labelCls}>CP *</label><input type="text" value={editForm.storeZipcode} onChange={(e) => setEditForm({ ...editForm, storeZipcode: e.target.value })} className={inputCls} /></div>
                <div className="flex-[2]"><label className={labelCls}>Ville *</label><input type="text" value={editForm.storeCity} onChange={(e) => setEditForm({ ...editForm, storeCity: e.target.value })} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Type de visite</label><input type="text" value={editForm.visitType} onChange={(e) => setEditForm({ ...editForm, visitType: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Assortiment</label><input type="text" value={editForm.assortment} onChange={(e) => setEditForm({ ...editForm, assortment: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Fréquence</label><input type="text" value={editForm.visitFrequence || ""} onChange={(e) => setEditForm({ ...editForm, visitFrequence: e.target.value || null })} className={inputCls} placeholder="Ex: Hebdomadaire" /></div>
              <div><label className={labelCls}>Représentant</label><input type="text" value={editForm.salesRep || ""} onChange={(e) => setEditForm({ ...editForm, salesRep: e.target.value || null })} className={inputCls} placeholder="Nom du représentant" /></div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleUpdateStore} disabled={updateStore.isPending}>{updateStore.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditingStore(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
