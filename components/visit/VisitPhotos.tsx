"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Upload, X, Trash2, Share2, CheckSquare, Square, Camera, GalleryHorizontalEnd } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { VisitPhoto, PhotoCategory } from "@/types/visit";

interface VisitPhotosProps {
  photos: VisitPhoto[];
  uploadingPhoto: boolean;
  selectMode: boolean;
  selectedPhotos: Set<string>;
  sharing: boolean;
  onFileSelect: (file: File, category: PhotoCategory) => void;
  onDeletePhoto: (photoId: string) => void;
  onDeleteSelected: () => void;
  onShareSelected: () => void;
  onToggleSelection: (photoId: string) => void;
  onSetSelectMode: (v: boolean) => void;
  onExitSelectMode: () => void;
  onOpenLightbox: (url: string) => void;
}

type PhotoTab = "all" | "before" | "after";

export default function VisitPhotos({
  photos, uploadingPhoto, selectMode, selectedPhotos, sharing,
  onFileSelect, onDeletePhoto, onDeleteSelected, onShareSelected,
  onToggleSelection, onSetSelectMode, onExitSelectMode, onOpenLightbox,
}: VisitPhotosProps) {
  const photoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<PhotoTab>("all");
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>("before");

  const filteredPhotos = activeTab === "all"
    ? photos
    : photos.filter((p) => p.category === activeTab);

  const beforeCount = photos.filter((p) => p.category === "before").length;
  const afterCount = photos.filter((p) => p.category === "after").length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      onFileSelect(f, uploadCategory);
      e.target.value = "";
    }
  };

  return (
    <>
      {/* Photo upload */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-teal-cpm" /> Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Category selector */}
          <div className="flex gap-1.5 mb-3">
            <button
              onClick={() => setUploadCategory("before")}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                uploadCategory === "before"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              Avant
            </button>
            <button
              onClick={() => setUploadCategory("after")}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                uploadCategory === "after"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              Après
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => photoRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-slate-200 dark:border-[#2e2e30] hover:border-teal-cpm dark:hover:border-teal-cpm/60 hover:bg-teal-cpm/5 transition-colors text-sm text-slate-500 dark:text-zinc-400 hover:text-teal-cpm disabled:opacity-50"
              aria-label="Prendre une photo"
            >
              {uploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              {uploadingPhoto ? "Envoi..." : "Caméra"}
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-slate-200 dark:border-[#2e2e30] hover:border-teal-cpm dark:hover:border-teal-cpm/60 hover:bg-teal-cpm/5 transition-colors text-sm text-slate-500 dark:text-zinc-400 hover:text-teal-cpm disabled:opacity-50"
              aria-label="Choisir depuis la galerie"
            >
              {uploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <GalleryHorizontalEnd className="w-4 h-4" />
              )}
              {uploadingPhoto ? "Envoi..." : "Galerie"}
            </button>
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      {/* Photos grid */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "all" ? "bg-teal-cpm text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                Toutes ({photos.length})
              </button>
              <button
                onClick={() => setActiveTab("before")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "before" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
              >
                Avant ({beforeCount})
              </button>
              <button
                onClick={() => setActiveTab("after")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "after" ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
              >
                Après ({afterCount})
              </button>
            </div>
            <button
              onClick={() => selectMode ? onExitSelectMode() : onSetSelectMode(true)}
              className="text-xs text-teal-cpm font-medium hover:underline"
            >
              {selectMode ? "Annuler" : "Sélectionner"}
            </button>
          </div>
          {filteredPhotos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Aucune photo dans cette catégorie</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
            {[...filteredPhotos]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((photo) => {
              const isSelected = selectedPhotos.has(photo.id);
              const photoDate = photo.visit?.visitDate
                ? new Date(photo.visit.visitDate).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "2-digit" })
                : new Date(photo.createdAt).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "2-digit" });
              const photoWeek = photo.visit?.week?.label;
              return (
                <div
                  key={photo.id}
                  className={`relative group rounded-lg overflow-hidden bg-slate-100 dark:bg-[#222223] border-2 transition-all ${
                    isSelected ? "border-teal-cpm ring-2 ring-teal-cpm/20" : photo.category === "before" ? "border-amber-300 dark:border-amber-700" : photo.category === "after" ? "border-green-300 dark:border-green-700" : "border-slate-200 dark:border-[#2e2e30]"
                  }`}
                >
                  {/* Category badge */}
                  {photo.category && !selectMode && (
                    <span className={`absolute top-1 left-1 z-[5] px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      photo.category === "before" ? "bg-amber-500 text-white" : "bg-green-500 text-white"
                    }`}>
                      {photo.category === "before" ? "Avant" : "Après"}
                    </span>
                  )}
                  {/* Selection checkbox */}
                  {selectMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelection(photo.id);
                      }}
                      className="absolute top-1 left-1 z-10 bg-white dark:bg-slate-800 rounded p-0.5 shadow"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-teal-cpm" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  )}
                  <Image
                    src={photo.url}
                    alt={photo.caption || "Photo visite"}
                    width={300}
                    height={300}
                    className="w-full aspect-square object-cover cursor-pointer"
                    onClick={() => selectMode ? onToggleSelection(photo.id) : onOpenLightbox(photo.url)}
                  />
                  {/* Delete button - only when not in select mode */}
                  {!selectMode && (
                    <button
                      onClick={() => onDeletePhoto(photo.id)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <div className="px-1.5 py-1 bg-white dark:bg-[#1a1a1b] border-t border-slate-100 dark:border-[#2e2e30]">
                    <p className="text-[10px] font-medium text-slate-700 dark:text-slate-200 leading-tight">
                      {photoDate}
                    </p>
                    {photoWeek && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                        {photoWeek}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Floating action bar for selection - compact on left to avoid chat button */}
          {selectMode && selectedPhotos.size > 0 && (
            <div className="fixed bottom-24 left-2 right-auto md:bottom-4 bg-white dark:bg-[#1a1a1b] rounded-xl shadow-lg border border-slate-200 dark:border-[#2e2e30] p-2 flex items-center gap-2 z-40 max-w-[280px]">
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap px-1">
                {selectedPhotos.size}
              </span>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onExitSelectMode}
                  className="h-8 px-2 text-xs"
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-teal-cpm border-teal-cpm/30 hover:bg-teal-cpm/10"
                  onClick={onDeleteSelected}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 bg-teal-cpm hover:bg-teal-cpm/85 text-white"
                  onClick={onShareSelected}
                  disabled={sharing}
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  {sharing ? "..." : "Partager"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
