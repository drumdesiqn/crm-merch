"use client";

import { X, Share2 } from "lucide-react";
import { showToast } from "@/components/Toast";

interface PhotoLightboxProps {
  url: string;
  onClose: () => void;
}

export default function PhotoLightbox({ url, onClose }: PhotoLightboxProps) {
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `photo-visite.jpg`, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Photo visite",
        });
      } else {
        // Fallback: download
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `photo-visite.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch {
      showToast("error", "Erreur lors du partage");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Top actions */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <button
          className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          onClick={handleShare}
          title="Partager"
          aria-label="Partager la photo"
        >
          <Share2 className="w-6 h-6" />
        </button>
        <button
          className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          onClick={onClose}
          title="Fermer"
        >
          <X className="w-8 h-8" />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Photo plein écran"
        className="max-w-full max-h-full object-contain rounded"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
