"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, User, Calendar, Tag, Package, AlertCircle, Wrench, ExternalLink, StickyNote, Image, History, Plus, Trash2, Upload, X, CheckCircle2, Clock, Ban, RotateCcw, Share2, CheckSquare, Square, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VISIT_TYPE_COLORS, ASSORTMENT_COLORS, formatDate, formatDateShort, compressImage, VisitStatus } from "@/lib/utils";
import { showToast } from "@/components/Toast";
import { STATUS_CONFIG } from "@/components/StatusBadge";

interface Visit {
  id: string;
  assortment: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeZipcode: string;
  storeCity: string;
  visitType: string;
  visitFrequence: string | null;
  visitDate: string;
  merchandiser: string | null;
  remarks: string | null;
  salesRep: string | null;
  materials: string | null;
  status: VisitStatus;
  materialType: string | null;
  week: { label: string };
}

interface VisitNote {
  id: string;
  content: string;
  createdAt: string;
  visit?: { visitDate: string; week: { label: string } } | null;
}

interface VisitPhoto {
  id: string;
  url: string;
  caption: string | null;
  createdAt: string;
  visit?: { visitDate: string; week: { label: string } } | null;
}

interface HistoryVisit {
  id: string;
  visitDate: string;
  visitType: string;
  week: { label: string };
  notes?: VisitNote[];
  photos?: VisitPhoto[];
  materialType?: string | null;
  status?: string;
}

type Tab = "visit" | "history";

const MATERIAL_TYPES: Record<string, string[]> = {
  snacking: [
    "TG star", "Butter", "Halfmoon", "Modulair", "Accroche", "Choco boutique", "Colorworks",
    "S180", "Self check out 3 layer display", "BE KIND single tower & metal HP tower",
    "BE KIND 3 layer display", "Plastic box & wooden box", "Display", "Arch", "Totem",
    "Standee", "Pop up", "Storbak/dumbbin display/flexi",
    "Big wobbler (totem, arch, display)", "Small wobbler (shelf)", "Small & big freezer",
  ],
  "food-pet": [
    "Arch", "Totem", "Caisse & Treat Furniture", "Wobbler in shelf",
    "Dumpbins & Free sample wobbler", "Special flexis", "Flexi Whiskas",
    "Flexi Sheba & Catisfactions", "Display", "Display & Totem", "Flexis + totem + arch",
  ],
};

function getMaterialTypes(assortment: string): string[] {
  const key = assortment.toLowerCase();
  if (key.includes("snacking")) return MATERIAL_TYPES.snacking;
  if (key.includes("food") || key.includes("pet") || key.includes("nutrition")) return MATERIAL_TYPES["food-pet"];
  return [...MATERIAL_TYPES.snacking, ...MATERIAL_TYPES["food-pet"]];
}

function MaterialTypeSelector({
  assortment, value, saving, onChange,
}: { assortment: string; value: string | null; saving: boolean; onChange: (v: string) => void }) {
  const types = getMaterialTypes(assortment);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-red-600" /> Type de matériel installé
          </span>
          {saving && <span className="text-xs text-slate-400 font-normal animate-pulse">Sauvegarde...</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => onChange(t)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                value === t
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-red-400 hover:text-red-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {value && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Sélectionné : <span className="font-medium text-red-600">{value}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function VisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("visit");
  const [status, setStatus] = useState<VisitStatus>("pending");
  const [savingStatus, setSavingStatus] = useState(false);
  const [materialType, setMaterialType] = useState<string | null>(null);
  const [savingMaterial, setSavingMaterial] = useState(false);

  // Notes & Photos state
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [photos, setPhotos] = useState<VisitPhoto[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // History state
  const [history, setHistory] = useState<HistoryVisit[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const visitId = params?.id as string;

  useEffect(() => {
    if (!visitId) return;
    fetch(`/api/visits/${visitId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          setVisit(data);
          setStatus((data.status as VisitStatus) || "pending");
          setMaterialType(data.materialType || null);
        } else {
          setVisit(null);
        }
        setLoading(false);
      })
      .catch(() => {
        showToast("error", "Erreur lors du chargement de la visite");
        setLoading(false);
      });

    // Load notes & photos eagerly in parallel
    Promise.all([
      fetch(`/api/visits/${visitId}/notes`)
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setNotes(d); })
        .catch(() => showToast("error", "Erreur lors du chargement des notes")),
      fetch(`/api/visits/${visitId}/photos`)
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setPhotos(d); })
        .catch(() => showToast("error", "Erreur lors du chargement des photos")),
    ]);
  }, [visitId]);

  // Load history eagerly in background once visit is known (for badge count)
  useEffect(() => {
    if (historyLoaded || !visit?.storeId) return;
    fetch(`/api/stores/${visit.storeId}/history`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setHistory(d.filter((v: HistoryVisit) => v.id !== visitId));
        setHistoryLoaded(true);
      })
      .catch(() => {
        showToast("error", "Erreur lors du chargement de l'historique");
        setHistoryLoaded(true);
      });
  }, [historyLoaded, visit?.storeId, visitId]);

  const addNote = async () => {
    if (!noteInput.trim()) return;
    const tempNote = {
      id: `temp-${Date.now()}`,
      content: noteInput.trim(),
      createdAt: new Date().toISOString(),
    };
    
    // Optimistic update
    setNotes((prev) => [tempNote, ...prev]);
    setNoteInput("");
    setAddingNote(true);
    
    try {
      const res = await fetch(`/api/visits/${visitId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tempNote.content }),
      });
      const data = await res.json();
      if (res.ok) {
        // Replace temp note with real one
        setNotes((prev) => prev.map((n) => n.id === tempNote.id ? data : n));
        showToast("success", "Note ajoutée");
      } else {
        // Revert on error
        setNotes((prev) => prev.filter((n) => n.id !== tempNote.id));
        setNoteInput(tempNote.content);
        showToast("error", "Erreur lors de l'ajout de la note");
      }
    } catch {
      // Revert on error
      setNotes((prev) => prev.filter((n) => n.id !== tempNote.id));
      setNoteInput(tempNote.content);
      showToast("error", "Erreur réseau");
    } finally {
      setAddingNote(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    const previousNotes = [...notes];
    
    // Optimistic update
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    
    try {
      await fetch(`/api/visits/${visitId}/notes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      showToast("success", "Note supprimée");
    } catch {
      // Revert on error
      setNotes(previousNotes);
      showToast("error", "Erreur lors de la suppression");
    }
  };

  const handleFileSelect = async (file: File) => {
    const tempPhoto = {
      id: `temp-${Date.now()}`,
      url: URL.createObjectURL(file),
      caption: null,
      createdAt: new Date().toISOString(),
      visitId,
      blobKey: "",
    };
    
    // Optimistic update
    setPhotos((prev) => [tempPhoto, ...prev]);
    setUploadingPhoto(true);
    
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
      const formData = new FormData();
      formData.append("file", compressed);
      const res = await fetch(`/api/visits/${visitId}/photos`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        // Replace temp photo with real one
        setPhotos((prev) => prev.map((p) => p.id === tempPhoto.id ? data : p));
        // Revoke temp URL
        URL.revokeObjectURL(tempPhoto.url);
        showToast("success", "Photo ajoutée");
      } else {
        // Revert on error
        setPhotos((prev) => prev.filter((p) => p.id !== tempPhoto.id));
        URL.revokeObjectURL(tempPhoto.url);
        showToast("error", "Erreur lors de l'ajout de la photo");
      }
    } catch {
      // Revert on error
      setPhotos((prev) => prev.filter((p) => p.id === tempPhoto.id));
      URL.revokeObjectURL(tempPhoto.url);
      showToast("error", "Erreur réseau");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedPhotos(new Set());
  };

  const shareSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) return;
    setSharing(true);
    try {
      const files: File[] = [];
      for (const photoId of selectedPhotos) {
        const photo = photos.find((p) => p.id === photoId);
        if (!photo) continue;
        const response = await fetch(photo.url);
        const blob = await response.blob();
        files.push(new File([blob], `photo-${photoId.slice(-6)}.jpg`, { type: blob.type }));
      }
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: `Photos visite (${files.length})` });
      } else {
        // Fallback: download first photo
        const url = window.URL.createObjectURL(files[0]);
        const a = document.createElement("a");
        a.href = url;
        a.download = files[0].name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch {
      showToast("error", "Erreur lors du partage");
    } finally {
      setSharing(false);
      exitSelectMode();
    }
  };

  const updateStatus = async (newStatus: VisitStatus) => {
    if (newStatus === status) return;
    setSavingStatus(true);
    try {
      await fetch("/api/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: visitId, status: newStatus }),
      });
      setStatus(newStatus);
      showToast("success", "Statut mis à jour");
    } catch {
      showToast("error", "Erreur lors de la mise à jour du statut");
    } finally {
      setSavingStatus(false);
    }
  };

  const updateMaterialType = async (val: string) => {
    const next = materialType === val ? null : val;
    setSavingMaterial(true);
    try {
      await fetch("/api/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: visitId, materialType: next }),
      });
      setMaterialType(next);
      showToast("success", "Type de matériel mis à jour");
    } catch {
      showToast("error", "Erreur lors de la mise à jour");
    } finally {
      setSavingMaterial(false);
    }
  };

  const exportVisitPDF = async () => {
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/visits/${visitId}/export`);
      if (!res.ok) throw new Error("Erreur lors de l'export");
      const data = await res.json();
      
      // Ouvrir dans une nouvelle fenêtre pour impression/PDF
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showToast("error", "Veuillez autoriser les popups pour l'export PDF");
        return;
      }
      
      const v = data.visit;
      const photosHtml = v.photos.map((p: {url: string, caption?: string}) => `
        <div style="margin: 10px; break-inside: avoid;">
          <img src="${p.url}" style="max-width: 100%; max-height: 300px; border-radius: 8px;" />
          ${p.caption ? `<p style="font-size: 12px; color: #666; margin-top: 5px;">${p.caption}</p>` : ""}
        </div>
      `).join("");
      
      const notesHtml = v.notes.map((n: {content: string, createdAt: string}) => `
        <div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 8px; break-inside: avoid;">
          <p style="font-size: 12px; color: #666; margin-bottom: 5px;">${new Date(n.createdAt).toLocaleString("fr-BE")}</p>
          <p style="font-size: 14px;">${n.content.replace(/\n/g, "<br>")}</p>
        </div>
      `).join("");
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Rapport de visite - ${v.storeName}</title>
          <style>
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; color: #333; }
            h1 { color: #dc2626; margin-bottom: 5px; }
            .header { border-bottom: 2px solid #dc2626; padding-bottom: 15px; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0; }
            .info-item { padding: 8px; background: #f9fafb; border-radius: 6px; }
            .info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
            .info-value { font-size: 14px; font-weight: 500; margin-top: 2px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; margin-right: 5px; }
            .badge-red { background: #fee2e2; color: #dc2626; }
            .badge-blue { background: #dbeafe; color: #2563eb; }
            .badge-gray { background: #f3f4f6; color: #6b7280; }
            .photos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            .section { margin: 25px 0; }
            .section-title { font-size: 16px; font-weight: 600; color: #dc2626; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
            .no-content { color: #9ca3af; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${v.storeName}</h1>
            <p style="color: #6b7280; margin: 5px 0;">#${v.storeId} | ${v.weekLabel}</p>
            <div style="margin-top: 10px;">
              <span class="badge badge-red">${v.visitType}</span>
              <span class="badge badge-blue">${v.assortment}</span>
              <span class="badge badge-gray">${v.status === "done" ? "Effectué" : v.status === "cancelled" ? "Annulé" : v.status === "postponed" ? "Reporté" : "En attente"}</span>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Date de visite</div>
              <div class="info-value">${new Date(v.visitDate).toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Adresse</div>
              <div class="info-value">${v.storeAddress}, ${v.storeZipcode} ${v.storeCity}</div>
            </div>
            ${v.merchandiser ? `
            <div class="info-item">
              <div class="info-label">Merchandiser</div>
              <div class="info-value">${v.merchandiser}</div>
            </div>
            ` : ""}
            ${v.salesRep ? `
            <div class="info-item">
              <div class="info-label">Sales Rep</div>
              <div class="info-value">${v.salesRep}</div>
            </div>
            ` : ""}
            ${v.visitFrequence ? `
            <div class="info-item">
              <div class="info-label">Fréquence</div>
              <div class="info-value">${v.visitFrequence}</div>
            </div>
            ` : ""}
            ${v.materialType ? `
            <div class="info-item">
              <div class="info-label">Matériel installé</div>
              <div class="info-value">${v.materialType}</div>
            </div>
            ` : ""}
          </div>
          
          ${v.remarks ? `
          <div class="section">
            <div class="section-title">Remarques</div>
            <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 12px; border-radius: 8px; color: #9a3412;">
              ${v.remarks.replace(/\n/g, "<br>")}
            </div>
          </div>
          ` : ""}
          
          ${v.materials ? `
          <div class="section">
            <div class="section-title">Matériel nécessaire</div>
            <div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 12px; border-radius: 8px; color: #6b21a8;">
              ${v.materials.replace(/\n/g, "<br>")}
            </div>
          </div>
          ` : ""}
          
          <div class="section">
            <div class="section-title">Photos (${v.photos.length})</div>
            ${v.photos.length > 0 ? `<div class="photos-grid">${photosHtml}</div>` : `<p class="no-content">Aucune photo</p>`}
          </div>
          
          <div class="section">
            <div class="section-title">Notes (${v.notes.length})</div>
            ${v.notes.length > 0 ? notesHtml : `<p class="no-content">Aucune note</p>`}
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center;">
            Rapport généré le ${new Date().toLocaleString("fr-BE")} • Mars Merch App
          </div>
          
          <script>
            setTimeout(() => window.print(), 500);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      showToast("success", "Rapport PDF ouvert");
    } catch {
      showToast("error", "Erreur lors de l'export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    try {
      const res = await fetch(`/api/visits/${visitId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur serveur");
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      showToast("success", "Photo supprimée");
    } catch {
      showToast("error", "Erreur lors de la suppression");
    }
  };

  const deleteSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`Supprimer ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? "s" : ""} ?`)) return;
    
    const ids = Array.from(selectedPhotos);
    let deletedCount = 0;
    for (const photoId of ids) {
      try {
        await fetch(`/api/visits/${visitId}/photos`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId }),
        });
        deletedCount++;
      } catch {
        // Continue with next photo
      }
    }
    setPhotos((prev) => prev.filter((p) => !selectedPhotos.has(p.id)));
    exitSelectMode();
    if (deletedCount > 0) {
      showToast("success", `${deletedCount} photo${deletedCount > 1 ? "s" : ""} supprimée${deletedCount > 1 ? "s" : ""}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center">
        <p className="text-slate-500">Visite introuvable.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">← Retour</Button>
      </div>
    );
  }

  const typeColor = VISIT_TYPE_COLORS[visit.visitType] || "bg-slate-100 text-slate-700 border-slate-200";
  const assortColor = ASSORTMENT_COLORS[visit.assortment] || "bg-slate-100 text-slate-700";
  const visitDateLocal = (() => {
    const iso = visit.visitDate.split("T")[0];
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isPast = visitDateLocal.getTime() < today.getTime();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${visit.storeAddress}, ${visit.storeZipcode} ${visit.storeCity}`)}`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(`${visit.storeAddress}, ${visit.storeZipcode} ${visit.storeCity}`)}&navigate=yes`;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "visit", label: "Visite", icon: <Calendar className="w-4 h-4" />, badge: notes.length + photos.length || undefined },
    { id: "history", label: "Historique", icon: <History className="w-4 h-4" />, badge: history.length || undefined },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" /> Retour au planning
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{visit.storeName}</h1>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 px-2"
              onClick={exportVisitPDF}
              disabled={exportingPdf}
              aria-label="Exporter en PDF"
            >
              {exportingPdf ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span className="hidden sm:inline ml-1">PDF</span>
            </Button>
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">#{visit.storeId}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${typeColor}`}>
            {visit.visitType}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${assortColor}`}>
            {visit.assortment}
          </span>
          <Badge variant="outline" className="text-xs">
            {visit.week.label}
          </Badge>
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Statut :</span>
          {(Object.keys(STATUS_CONFIG) as VisitStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const isActive = status === s;
            return (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={savingStatus}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 min-h-[36px] rounded-full border font-medium transition-all ${
                  isActive
                    ? cfg.color + " ring-2 ring-offset-1 " + cfg.color.replace("bg-", "ring-").split(" ")[0]
                    : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                }`}
              >
                {cfg.icon}
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors relative ${
              tab === t.id ? "bg-red-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            } ${t.id !== "visit" ? "border-l border-slate-200 dark:border-slate-600" : ""}`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tab === t.id ? "bg-white/20 text-white" : "bg-red-100 text-red-700"}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Visite ── */}
      {tab === "visit" && (
        <div className="space-y-4">
          {/* Consolidated info card */}
          <Card>
            <CardContent className="py-3 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-red-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Date de visite</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">{formatDate(visit.visitDate)}</p>
                </div>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-700" />
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Adresse</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.storeAddress}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{visit.storeZipcode} {visit.storeCity}</p>
                </div>
              </div>
              {visit.salesRep && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-slate-700" />
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-red-600 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sales Representative</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.salesRep}</p>
                    </div>
                  </div>
                </>
              )}
              {visit.visitFrequence && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-slate-700" />
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-red-600 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Type / Fréquence</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.visitFrequence}</p>
                    </div>
                  </div>
                </>
              )}
              {visit.merchandiser && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-slate-700" />
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-red-600 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Merchandiser</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.merchandiser}</p>
                    </div>
                  </div>
                </>
              )}
              <div className="h-px bg-slate-100 dark:bg-slate-700" />
              <div className="flex gap-2 pt-1">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Google Maps
                </a>
                <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-sm font-medium hover:bg-sky-100 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Waze
                </a>
              </div>
            </CardContent>
          </Card>

          {visit.remarks && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-orange-800">
                  <AlertCircle className="w-4 h-4" /> Remarques
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-4">
                <p className="text-sm text-orange-900 whitespace-pre-wrap">{visit.remarks}</p>
              </CardContent>
            </Card>
          )}

          {visit.materials && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-purple-800">
                  <Wrench className="w-4 h-4" /> Matériel nécessaire
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-4">
                <p className="text-sm text-purple-900 whitespace-pre-wrap">{visit.materials}</p>
              </CardContent>
            </Card>
          )}

          {/* ── Type de matériel installé ── */}
          <MaterialTypeSelector
            assortment={visit.assortment}
            value={materialType}
            saving={savingMaterial}
            onChange={updateMaterialType}
          />

          {/* ── Notes & Photos (merged into visit tab) ── */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-red-600" />
                <p className="text-sm font-semibold text-slate-600">Notes & Photos</p>
                {(notes.length + photos.length) > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">{notes.length + photos.length}</span>
                )}
              </div>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

          {/* Add note */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-red-600" /> Ajouter une note
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Ex: Facing refait, clipstrip ajouté côté gauche..."
                className="w-full min-h-[90px] resize-none rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote(); }}
              />
              <Button size="sm" onClick={addNote} disabled={!noteInput.trim() || addingNote}>
                <Plus className="w-4 h-4" />
                {addingNote ? "Enregistrement..." : "Ajouter la note"}
              </Button>
            </CardContent>
          </Card>

          {/* Notes list */}
          {notes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes ({notes.length})</p>
              {[...notes]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((note) => (
                <Card key={note.id} className="border-slate-200">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{note.content}</p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(note.createdAt).toLocaleDateString("fr-BE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {note.visit?.week?.label && (
                        <span className="ml-2 text-red-500 font-medium">· {note.visit.week.label}</span>
                      )}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

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
                    handleFileSelect(f);
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
                    handleFileSelect(f);
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
                  onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
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
                            togglePhotoSelection(photo.id);
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
                        onClick={() => selectMode ? togglePhotoSelection(photo.id) : setLightboxUrl(photo.url)}
                      />
                      {/* Delete button - only when not in select mode */}
                      {!selectMode && (
                        <button
                          onClick={() => deletePhoto(photo.id)}
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
                      onClick={exitSelectMode}
                      className="h-8 px-2 text-xs"
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={deleteSelectedPhotos}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white"
                      onClick={shareSelectedPhotos}
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

          {notes.length === 0 && photos.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-6">Aucune note ni photo pour cette visite.</p>
          )}
          </div>
        </div>
      )}

      {/* ── Tab: Historique ── */}
      {tab === "history" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Toutes les visites précédentes à <strong>{visit.storeName}</strong>
          </p>

          {!historyLoaded && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {historyLoaded && history.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              Aucune autre visite enregistrée pour ce magasin.
            </div>
          )}

          {history.map((v) => {
            const hTypeColor = VISIT_TYPE_COLORS[v.visitType] || "bg-slate-100 text-slate-700 border-slate-200";
            return (
              <Link key={v.id} href={`/planning/${v.id}`}>
                <Card className="hover:shadow-md hover:border-red-200 transition-all cursor-pointer">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-900 capitalize">
                            {formatDateShort(v.visitDate)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${hTypeColor}`}>
                            {v.visitType}
                          </span>
                          <span className="text-xs text-slate-400">{v.week.label}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {v.materialType && (
                            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full">
                              <Wrench className="w-3 h-3" /> {v.materialType}
                            </span>
                          )}
                          {(v.notes?.length || 0) > 0 && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <StickyNote className="w-3 h-3" /> {v.notes!.length} note{v.notes!.length > 1 ? "s" : ""}
                            </span>
                          )}
                          {(v.photos?.length || 0) > 0 && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Image className="w-3 h-3" /> {v.photos!.length} photo{v.photos!.length > 1 ? "s" : ""}
                            </span>
                          )}
                          {(v.notes?.length || 0) === 0 && (v.photos?.length || 0) === 0 && !v.materialType && (
                            <span className="text-xs text-slate-300">Aucune note</span>
                          )}
                        </div>
                        {/* Preview first note */}
                        {v.notes?.[0] && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic">"{v.notes[0].content}"</p>
                        )}
                        {/* Preview photos thumbnails */}
                        {(v.photos?.length || 0) > 0 && (
                          <div className="flex gap-1 mt-2">
                            {v.photos!.slice(0, 4).map((p) => (
                              <div key={p.id} className="w-10 h-10 rounded overflow-hidden bg-slate-100 shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {v.photos!.length > 4 && (
                              <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                                +{v.photos!.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* Top actions */}
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const response = await fetch(lightboxUrl);
                  const blob = await response.blob();
                  const file = new File([blob], `photo-visite.jpg`, { type: blob.type });
                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                      files: [file],
                      title: "Photo visite",
                    });
                  } else {
                    // Fallback: download
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `photo-visite.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }
                } catch {
                  showToast("error", "Erreur lors du partage");
                }
              }}
              title="Partager"
              aria-label="Partager la photo"
            >
              <Share2 className="w-6 h-6" />
            </button>
            <button
              className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              onClick={() => setLightboxUrl(null)}
              title="Fermer"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Photo plein écran"
            className="max-w-full max-h-full object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
