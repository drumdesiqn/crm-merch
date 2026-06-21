"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Store, MapPin, Calendar, TrendingUp, Search, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface StoreData {
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeZipcode: string;
  storeCity: string;
  totalVisits: number;
  completedVisits: number;
  lastVisit: string;
  materialTypes: string[];
  totalPhotos: number;
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetchStores();
  }, [sortBy, sortOrder]);

  const fetchStores = async () => {
    try {
      const res = await fetch(`/api/stores?sortBy=${sortBy}&order=${sortOrder}`);
      const data = await res.json();
      setStores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter((store) =>
    store.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.storeCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.storeAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Magasins</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {stores.length} magasin{stores.length !== 1 ? "s" : ""} visité{stores.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un magasin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Rechercher un magasin"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-slate-900 border-blue-100 dark:border-blue-900">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stores.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total magasins</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-slate-900 border-green-100 dark:border-green-900">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-green-700 dark:text-green-400">
              {stores.reduce((sum, s) => sum + s.totalVisits, 0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total visites</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/50 dark:to-slate-900 border-purple-100 dark:border-purple-900">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
              {stores.reduce((sum, s) => sum + s.completedVisits, 0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Visites terminées</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/50 dark:to-slate-900 border-orange-100 dark:border-orange-900">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {stores.filter((s) => s.totalVisits > 0).length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Magasins actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Stores list */}
      <div className="grid gap-3">
        {filteredStores.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Aucun magasin trouvé</p>
            </CardContent>
          </Card>
        ) : (
          filteredStores.map((store) => (
            <Link key={store.storeId} href={`/stores/${store.storeId}/history`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {store.storeName}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {store.totalVisits} visite{store.totalVisits !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">
                          {store.storeAddress}, {store.storeZipcode} {store.storeCity}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Dernière: {formatDate(store.lastVisit)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>
                            {store.completedVisits}/{store.totalVisits} terminées
                          </span>
                        </div>
                        {store.totalPhotos > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {store.totalPhotos} photo{store.totalPhotos !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                      {store.materialTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {store.materialTypes.slice(0, 3).map((type) => (
                            <Badge key={type} className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                              {type}
                            </Badge>
                          ))}
                          {store.materialTypes.length > 3 && (
                            <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                              +{store.materialTypes.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
