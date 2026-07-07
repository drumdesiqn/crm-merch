"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { VisitPhoto } from "@/types/visit";
import { Star, Camera, Store, X, ChevronDown, ChevronUp, Search, ImageOff } from "lucide-react";
import Image from "next/image";

interface PhotoWithVisit extends VisitPhoto {
  visit: { visitDate: string; storeName: string; storeCity: string; week: { label: string } } | null;
}

interface StoreGroup {
  storeId: string;
  storeName: string;
  storeCity: string;
  photos: PhotoWithVisit[];
  lastDate: string;
}

function useAllPhotos() {
  return useQuery<PhotoWithVisit[]>({
    queryKey: ["all-photos"],
    queryFn: async () => {
      const data = await fetchApi<PhotoWithVisit[]>("/api/photos");
      return data ?? [];
    },
  });
}

function PhotoCard({ photo, onStar, onClick }: { photo: PhotoWithVisit; onStar: (id: string, starred: boolean) => void; onClick: () => void }) {
  const date = photo.visit?.visitDate
    ? new Date(photo.visit.visitDate).toLocaleDateString("fr-BE", { day: "2-digit", month: "short", year: "numeric" })
    : new Date(photo.createdAt).toLocaleDateString("fr-BE", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="relative group rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-square cursor-pointer shadow-sm hover:shadow-md transition-all">
      <Image
        src={photo.url}
        alt={photo.caption || photo.visit?.storeName || "Photo"}
        fill
        className="object-cover transition-transform group-hover:scale-105"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        onClick={onClick}
      />
      {/* Star button — always visible on touch devices, hover-only on desktop */}
      <button
        onClick={(e) => { e.stopPropagation(); onStar(photo.id, !photo.starred); }}
        className={`absolute top-2 right-2 z-10 p-2 rounded-full transition-all shadow-md ${photo.starred ? "bg-yellow-400 text-white" : "bg-black/50 text-white sm:opacity-0 sm:group-hover:opacity-100"}`}
        title={photo.starred ? "Retirer des coups de cœur" : "Ajouter aux coups de cœur"}
      >
        <Star className={`w-4 h-4 ${photo.starred ? "fill-white" : ""}`} />
      </button>
      {/* Overlay info — always visible on mobile, hover on desktop */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform">
        <p className="text-white text-xs font-medium truncate">{photo.caption || date}</p>
      </div>
    </div>
  );
}

function Lightbox({ photos, index, onClose, onNav }: { photos: PhotoWithVisit[]; index: number; onClose: () => void; onNav: (i: number) => void }) {
  const photo = photos[index];
  if (!photo) return null;
  const date = photo.visit?.visitDate
    ? new Date(photo.visit.visitDate).toLocaleDateString("fr-BE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    : new Date(photo.createdAt).toLocaleDateString("fr-BE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10" onClick={onClose}>
        <X className="w-6 h-6" />
      </button>
      {/* Desktop side arrows */}
      {index > 0 && (
        <button
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
          onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
        >
          <ChevronUp className="-rotate-90 w-5 h-5" />
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
          onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
        >
          <ChevronDown className="-rotate-90 w-5 h-5" />
        </button>
      )}
      <div className="max-w-4xl w-full max-h-[85vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full max-h-[70vh] flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.caption || ""} className="max-h-[70vh] max-w-full rounded-xl object-contain" />
        </div>
        <div className="text-center px-2">
          {photo.caption && <p className="text-white font-medium text-sm">{photo.caption}</p>}
          <p className="text-white/60 text-xs sm:text-sm capitalize">{date}</p>
          {photo.visit?.storeName && (
            <p className="text-white/50 text-xs mt-0.5">{photo.visit.storeName} · {photo.visit.week?.label}</p>
          )}
        </div>
        {/* Mobile bottom nav */}
        <div className="flex items-center gap-4 sm:hidden">
          <button
            onClick={(e) => { e.stopPropagation(); if (index > 0) onNav(index - 1); }}
            disabled={index === 0}
            className="bg-white/10 disabled:opacity-30 text-white rounded-full p-3"
          >
            <ChevronUp className="-rotate-90 w-5 h-5" />
          </button>
          <p className="text-white/40 text-xs">{index + 1} / {photos.length}</p>
          <button
            onClick={(e) => { e.stopPropagation(); if (index < photos.length - 1) onNav(index + 1); }}
            disabled={index === photos.length - 1}
            className="bg-white/10 disabled:opacity-30 text-white rounded-full p-3"
          >
            <ChevronDown className="-rotate-90 w-5 h-5" />
          </button>
        </div>
        <p className="hidden sm:block text-white/30 text-xs">{index + 1} / {photos.length}</p>
      </div>
    </div>
  );
}

export default function PhotosPage() {
  const queryClient = useQueryClient();
  const { data: allPhotos = [], isLoading } = useAllPhotos();
  const [tab, setTab] = useState<"stores" | "starred" | "today">("stores");
  const [search, setSearch] = useState("");
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ photos: PhotoWithVisit[]; index: number } | null>(null);

  const starMutation = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
      fetchApi(`/api/photos/${id}`, { method: "PATCH", body: JSON.stringify({ starred }) }),
    onMutate: async ({ id, starred }) => {
      await queryClient.cancelQueries({ queryKey: ["all-photos"] });
      const prev = queryClient.getQueryData<PhotoWithVisit[]>(["all-photos"]);
      queryClient.setQueryData<PhotoWithVisit[]>(["all-photos"], (old) =>
        old?.map((p) => p.id === id ? { ...p, starred } : p) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["all-photos"], ctx.prev);
    },
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todayPhotos = useMemo(() =>
    allPhotos.filter((p) => {
      const ref = p.visit?.visitDate || p.createdAt;
      return ref.startsWith(todayStr);
    }),
    [allPhotos, todayStr]
  );

  const starredPhotos = useMemo(() =>
    allPhotos.filter((p) => p.starred),
    [allPhotos]
  );

  const storeGroups = useMemo((): StoreGroup[] => {
    const map = new Map<string, StoreGroup>();
    for (const p of allPhotos) {
      const key = p.storeId || p.visit?.storeName || "unknown";
      const name = p.visit?.storeName || p.storeName || "Magasin inconnu";
      const city = p.visit?.storeCity || "";
      if (!map.has(key)) {
        const refDate = p.visit?.visitDate || p.createdAt;
        map.set(key, { storeId: key, storeName: name, storeCity: city, photos: [], lastDate: refDate });
      }
      map.get(key)!.photos.push(p);
    }
    return Array.from(map.values())
      .filter((g) => !search || g.storeName.toLowerCase().includes(search.toLowerCase()) || g.storeCity.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }, [allPhotos, search]);

  const toggleStore = (id: string) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-mars border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Camera className="w-6 h-6 text-blue-mars" />
            Médiathèque
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{allPhotos.length} photo{allPhotos.length > 1 ? "s" : ""} au total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {[
          { key: "stores", label: "Par magasin", labelShort: "Magasins", icon: Store },
          { key: "starred", label: `Coups de cœur${starredPhotos.length > 0 ? ` (${starredPhotos.length})` : ""}`, labelShort: `★${starredPhotos.length > 0 ? ` ${starredPhotos.length}` : ""}`, icon: Star },
          { key: "today", label: `Aujourd'hui${todayPhotos.length > 0 ? ` (${todayPhotos.length})` : ""}`, labelShort: `Auj.${todayPhotos.length > 0 ? ` (${todayPhotos.length})` : ""}`, icon: Camera },
        ].map(({ key, label, labelShort, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === key ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"}`}
          >
            <Icon className="w-4 h-4" />
            <span className="sm:hidden">{labelShort}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {tab === "today" && (
        <div className="space-y-4">
          {todayPhotos.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-600">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Pas encore de photos pour aujourd&apos;hui</p>
              <p className="text-sm mt-1">Les photos des visites planifiées ce jour apparaîtront ici</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {todayPhotos.map((p, i) => (
                <PhotoCard key={p.id} photo={p} onStar={(id, s) => starMutation.mutate({ id, starred: s })} onClick={() => setLightbox({ photos: todayPhotos, index: i })} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* STARRED TAB */}
      {tab === "starred" && (
        <div className="space-y-4">
          {starredPhotos.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-600">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun coup de cœur</p>
              <p className="text-sm mt-1">Clique sur l&apos;étoile d&apos;une photo pour la mettre en avant</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {starredPhotos.map((p, i) => (
                <PhotoCard key={p.id} photo={p} onStar={(id, s) => starMutation.mutate({ id, starred: s })} onClick={() => setLightbox({ photos: starredPhotos, index: i })} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* STORES TAB */}
      {tab === "stores" && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher un magasin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-mars"
            />
          </div>

          {allPhotos.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-600">
              <ImageOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucune photo disponible</p>
              <p className="text-sm mt-1">Ajoute des photos depuis les visites dans le planning</p>
            </div>
          ) : storeGroups.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">Aucun résultat pour &ldquo;{search}&rdquo;</p>
          ) : (
            storeGroups.map((group) => {
              const isExpanded = expandedStores.has(group.storeId);
              const preview = group.photos.slice(0, 4);
              const lastDate = new Date(group.lastDate).toLocaleDateString("fr-BE", { day: "2-digit", month: "short", year: "numeric" });
              const weekLabel = group.photos[0]?.visit?.week?.label;
              return (
                <div key={group.storeId} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {/* Store header */}
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    onClick={() => toggleStore(group.storeId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {preview.map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={p.id} src={p.url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-900" />
                        ))}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{group.storeName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {group.storeCity && <span className="mr-2">{group.storeCity}</span>}
                          {group.photos.length} photo{group.photos.length > 1 ? "s" : ""}
                          {weekLabel && <span className="ml-2 text-slate-400">· {weekLabel}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 hidden sm:block">{lastDate}</span>
                      {group.photos.some((p) => p.starred) && (
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded grid */}
                  {isExpanded && (
                    <div className="px-4 pb-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      {group.photos.map((p, i) => (
                        <PhotoCard
                          key={p.id}
                          photo={p}
                          onStar={(id, s) => starMutation.mutate({ id, starred: s })}
                          onClick={() => setLightbox({ photos: group.photos, index: i })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNav={(i) => setLightbox((prev) => prev ? { ...prev, index: i } : null)}
        />
      )}
    </div>
  );
}
