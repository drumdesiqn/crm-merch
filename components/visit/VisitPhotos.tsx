"use client";

import { useRef } from "react";
import { Image, Upload, X, Trash2, Share2, CheckSquare, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { VisitPhoto } from "@/types/visit";

interface VisitPhotosProps {
  photos: VisitPhoto[];
  uploadingPhoto: boolean;
  selectMode: boolean;
  selectedPhotos: Set<string>;
  sharing: boolean;
  onFileSelect: (file: File) => void;
  onDeletePhoto: (photoId: string) => void;
  onDeleteSelected: () => void;
  onShareSelected: () => void;
  onToggleSelection: (photoId: string) => void;
  onSetSelectMode: (v: boolean) => void;
  onExitSelectMode: () => void;
  onOpenLightbox: (url: string) => void;
}

export default function VisitPhotos({
  photos, uploadingPhoto, selectMode, selectedPhotos, sharing,
  onFileSelect, onDeletePhoto, onDeleteSelected, onShareSelected,
  onToggleSelection, onSetSelectMode, onExitSelectMode, onOpenLightbox,
}: VisitPhotosProps) {
  const photoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Photo upload */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="w-4 h-4 text-red-600" /> Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <button
              onClick={() => photoRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors text-sm text-slate-500 hover:text-red-600 disabled:opacity-50"
              aria-label="Prendre une photo"
            >
              {uploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploadingPhoto ? "Envoi..." : "Caméra"}
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors text-sm text-slate-500 hover:text-red-600 disabled:opacity-50"
              aria-label="Choisir depuis la galerie"
            >
              {uploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Image className="w-4 h-4" />
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                onFileSelect(f);
                e.target.value = "";
              }
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                onFileSelect(f);
                e.target.value = "";
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Photos grid */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Photos ({photos.length})</p>
            <button
              onClick={() => selectMode ? onExitSelectMode() : onSetSelectMode(true)}
              className="text-xs text-red-600 font-medium hover:underline"
            >
              {selectMode ? "Annuler" : "Sélectionner"}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[...photos]
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
                  className={`relative group rounded-lg overflow-hidden bg-slate-100 border-2 transition-all ${
                    isSelected ? "border-red-500 ring-2 ring-red-500/20" : "border-slate-200"
                  }`}
                >
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
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || "Photo visite"}
                    className={`w-full aspect-square object-cover ${selectMode ? "cursor-pointer" : "cursor-pointer"}`}
                    onClick={() => selectMode ? onToggleSelection(photo.id) : onOpenLightbox(photo.url)}
                  />
                  {/* Delete button - only when not in select mode */}
                  {!selectMode && (
                    <button
                      onClick={() => onDeletePhoto(photo.id)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <div className="px-1.5 py-1 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
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

          {/* Floating action bar for selection - compact on left to avoid chat button */}
          {selectMode && selectedPhotos.size > 0 && (
            <div className="fixed bottom-24 left-2 right-auto md:bottom-4 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-2 flex items-center gap-2 z-40 max-w-[280px]">
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
                  className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={onDeleteSelected}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white"
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
