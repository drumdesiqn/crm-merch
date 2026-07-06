"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, History, StickyNote, FileDown, Navigation, MapPin, CheckCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VISIT_TYPE_COLORS, ASSORTMENT_COLORS, compressImage, escapeHtml, VisitStatus } from "@/lib/utils";
import { fetchApi } from "@/lib/client-api";
import { PDF_BASE_STYLES, pdfPhotoItem, pdfNoteItem, pdfFooter } from "@/lib/pdf-template";
import { showToast } from "@/components/Toast";
import { STATUS_CONFIG } from "@/components/StatusBadge";
import { useVisit } from "@/lib/hooks/useVisit";
import { useVisitNotes } from "@/lib/hooks/useVisitNotes";
import { useVisitPhotos } from "@/lib/hooks/useVisitPhotos";
import { useStoreHistory } from "@/lib/hooks/useStoreHistory";
import { useDeleteVisit } from "@/lib/hooks/useDeleteVisit";
import type { VisitNote, VisitPhoto } from "@/types/visit";
import VisitInfoCard from "@/components/visit/VisitInfoCard";
import MaterialTypeSelector from "@/components/visit/MaterialTypeSelector";
import VisitNotes from "@/components/visit/VisitNotes";
import VisitPhotos from "@/components/visit/VisitPhotos";
import VisitHistory from "@/components/visit/VisitHistory";
import PhotoLightbox from "@/components/visit/PhotoLightbox";
import { VisitDetailSkeleton } from "@/components/Skeleton";

type Tab = "visit" | "history";

export default function VisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("visit");
  const [status, setStatus] = useState<VisitStatus>("pending");
  const [savingStatus, setSavingStatus] = useState(false);
  const [materialType, setMaterialType] = useState<string[]>([]);
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<VisitStatus | null>(null);

  const visitId = params?.id as string;

  const { data: visit, isLoading: visitLoading } = useVisit(visitId);
  const { data: queryNotes = [], isLoading: notesLoading } = useVisitNotes(visitId);
  const { data: queryPhotos = [], isLoading: photosLoading } = useVisitPhotos(visitId);
  const { data: history = [], isLoading: historyLoading } = useStoreHistory(visit?.storeId || undefined, visitId);
  const deleteVisit = useDeleteVisit();

  const loading = visitLoading || notesLoading || photosLoading;

  useEffect(() => {
    setNotes(queryNotes);
  }, [queryNotes]);

  useEffect(() => {
    setPhotos(queryPhotos);
  }, [queryPhotos]);

  useEffect(() => {
    if (visit) {
      setStatus((visit.status as VisitStatus) || "pending");
      setMaterialType(visit.materialType ? visit.materialType.split(", ").filter(Boolean) : []);
    }
  }, [visit]);

  const addNote = async () => {
    if (!noteInput.trim()) return;

    const content = noteInput.trim();
    setNoteInput("");
    setAddingNote(true);

    const data = await fetchApi<VisitNote>(`/api/visits/${visitId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      suppressToast: true,
    });
    if (data) {
      setNotes((prev) => [data, ...prev]);
      showToast("success", "Note ajoutée");
    } else {
      setNoteInput(content);
      showToast("error", "Erreur lors de l'ajout de la note");
    }
    setAddingNote(false);
  };

  const deleteNote = async (noteId: string) => {
    setConfirmDeleteNoteId(noteId);
  };

  const confirmNoteDelete = async () => {
    if (!confirmDeleteNoteId) return;
    const noteId = confirmDeleteNoteId;
    setConfirmDeleteNoteId(null);
    const previousNotes = [...notes];
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    const ok = await fetchApi(`/api/visits/${visitId}/notes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
      suppressToast: true,
    });
    if (ok !== null) {
      showToast("success", "Note supprimée");
    } else {
      setNotes(previousNotes);
      showToast("error", "Erreur lors de la suppression");
    }
  };

  const handleFileSelect = async (file: File) => {
    setUploadingPhoto(true);
    const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
    const formData = new FormData();
    formData.append("file", compressed);
    const data = await fetchApi<VisitPhoto>(`/api/visits/${visitId}/photos`, {
      method: "POST",
      body: formData,
      suppressToast: true,
    });
    if (data) {
      setPhotos((prev) => [data, ...prev]);
      showToast("success", "Photo ajoutée");
    } else {
      showToast("error", "Erreur lors de l'ajout de la photo");
    }
    setUploadingPhoto(false);
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

  const IRREVERSIBLE_STATUSES: VisitStatus[] = ["done", "cancelled"];

  const updateStatus = async (newStatus: VisitStatus) => {
    if (newStatus === status) return;
    if (IRREVERSIBLE_STATUSES.includes(newStatus) && status !== "done" && status !== "cancelled") {
      setPendingStatus(newStatus);
      return;
    }
    await applyStatus(newStatus);
  };

  const applyStatus = async (newStatus: VisitStatus) => {
    const previousStatus = status;
    setSavingStatus(true);
    setStatus(newStatus);
    const ok = await fetchApi("/api/visits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: visitId, status: newStatus }),
      suppressToast: true,
    });
    if (ok !== null) {
      showToast("success", "Statut mis à jour");
    } else {
      setStatus(previousStatus);
      showToast("error", "Erreur lors de la mise à jour du statut");
    }
    setSavingStatus(false);
  };

  const updateMaterialType = async (val: string[]) => {
    setSavingMaterial(true);
    // Convert array to comma-separated string for storage
    const materialTypeString = val.length > 0 ? val.join(", ") : null;
    const ok = await fetchApi("/api/visits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: visitId, materialType: materialTypeString }),
      suppressToast: true,
    });
    if (ok !== null) {
      setMaterialType(val);
      showToast("success", "Type de matériel mis à jour");
    } else {
      showToast("error", "Erreur lors de la mise à jour");
    }
    setSavingMaterial(false);
  };

  const exportVisitPDF = async () => {
    setExportingPdf(true);
    interface ExportVisitResponse {
      visit: {
        photos: { url: string; caption?: string }[];
        notes: { content: string; createdAt: string }[];
        storeName: string;
        storeId: string;
        weekLabel: string;
        visitType: string;
        assortment: string;
        status: string;
        visitDate: string;
        storeAddress: string;
        storeZipcode: string;
        storeCity: string;
        merchandiser?: string;
        salesRep?: string;
        visitFrequence?: string;
        materialType?: string;
        remarks?: string;
        materials?: string;
      };
    }
    const data = await fetchApi<ExportVisitResponse>(`/api/visits/${visitId}/export`, {
      suppressToast: true,
    });
    if (!data) {
      showToast("error", "Erreur lors de l'export PDF");
      setExportingPdf(false);
      return;
    }

    try {
      // Ouvrir dans une nouvelle fenêtre pour impression/PDF
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showToast("error", "Veuillez autoriser les popups pour l'export PDF");
        return;
      }

      const v = data.visit;
      const photosHtml = v.photos.map((p) => pdfPhotoItem(p.url, p.caption)).join("");
      const notesHtml = v.notes.map((n) => pdfNoteItem(n.content, n.createdAt)).join("");
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Rapport de visite - ${escapeHtml(v.storeName)}</title>
          <style>
            ${PDF_BASE_STYLES}
            h1 { color: #0010A4; margin-bottom: 5px; }
            .header { border-bottom: 2px solid #0010A4; padding-bottom: 15px; margin-bottom: 20px; }
            .info-item { padding: 8px; background: #f9fafb; border-radius: 6px; }
            .info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
            .info-value { font-size: 14px; font-weight: 500; margin-top: 2px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; margin-right: 5px; }
            .badge-red { background: #fee2e2; color: #C8102E; }
            .badge-blue { background: #dbeafe; color: #0010A4; }
            .badge-gray { background: #f3f4f6; color: #6b7280; }
            .section-title { font-size: 16px; font-weight: 600; color: #0010A4; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${escapeHtml(v.storeName)}</h1>
            <p style="color: #6b7280; margin: 5px 0;">#${escapeHtml(v.storeId)} | ${escapeHtml(v.weekLabel)}</p>
            <div style="margin-top: 10px;">
              <span class="badge badge-red">${escapeHtml(v.visitType)}</span>
              <span class="badge badge-blue">${escapeHtml(v.assortment)}</span>
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
              <div class="info-value">${escapeHtml(v.storeAddress)}, ${escapeHtml(v.storeZipcode)} ${escapeHtml(v.storeCity)}</div>
            </div>
            ${v.merchandiser ? `
            <div class="info-item">
              <div class="info-label">Merchandiser</div>
              <div class="info-value">${escapeHtml(v.merchandiser)}</div>
            </div>
            ` : ""}
            ${v.salesRep ? `
            <div class="info-item">
              <div class="info-label">Sales Rep</div>
              <div class="info-value">${escapeHtml(v.salesRep)}</div>
            </div>
            ` : ""}
            ${v.visitFrequence ? `
            <div class="info-item">
              <div class="info-label">Fréquence</div>
              <div class="info-value">${escapeHtml(v.visitFrequence)}</div>
            </div>
            ` : ""}
            ${v.materialType ? `
            <div class="info-item">
              <div class="info-label">Matériel installé</div>
              <div class="info-value">${v.materialType.split(", ").filter(Boolean).map((t: string) => `<span class="badge badge-red">${escapeHtml(t)}</span>`).join("")}</div>
            </div>
            ` : ""}
          </div>
          
          ${v.remarks ? `
          <div class="section">
            <div class="section-title">Remarques</div>
            <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 12px; border-radius: 8px; color: #9a3412;">
              ${escapeHtml(v.remarks).replace(/\n/g, "<br>")}
            </div>
          </div>
          ` : ""}
          
          ${v.materials ? `
          <div class="section">
            <div class="section-title">Matériel nécessaire</div>
            <div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 12px; border-radius: 8px; color: #6b21a8;">
              ${escapeHtml(v.materials).replace(/\n/g, "<br>")}
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
          
          ${pdfFooter()}
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
    const previousPhotos = [...photos];
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));

    const ok = await fetchApi(`/api/visits/${visitId}/photos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId }),
      suppressToast: true,
    });
    if (ok !== null) {
      showToast("success", "Photo supprimée");
    } else {
      setPhotos(previousPhotos);
      showToast("error", "Erreur lors de la suppression");
    }
  };

  const deleteSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`Supprimer ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? "s" : ""} ?`)) return;

    const ids = Array.from(selectedPhotos);
    const previousPhotos = [...photos];
    setPhotos((prev) => prev.filter((p) => !selectedPhotos.has(p.id)));
    exitSelectMode();

    const results = await Promise.allSettled(
      ids.map((photoId) =>
        fetchApi(`/api/visits/${visitId}/photos`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId }),
          suppressToast: true,
        }).then((ok) => {
          if (ok === null) throw new Error("Server error");
          return photoId;
        })
      )
    );

    const deletedIds = new Set(
      results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<string>).value)
    );

    if (deletedIds.size === ids.length) {
      showToast("success", `${ids.length} photo${ids.length > 1 ? "s" : ""} supprimée${ids.length > 1 ? "s" : ""}`);
    } else {
      // Revert photos that failed to delete
      setPhotos(previousPhotos);
      showToast("error", `${ids.length - deletedIds.size} photo(s) non supprimée(s)`);
    }
  };

  if (loading) {
    return <VisitDetailSkeleton />;
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
            {/* Navigation buttons */}
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00bfff]/10 hover:bg-[#00bfff]/20 transition-colors"
              title="Naviguer avec Waze"
            >
              <Navigation className="w-4 h-4 text-[#00bfff]" />
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-900/40 transition-colors"
              title="Voir sur Google Maps"
            >
              <MapPin className="w-4 h-4 text-green-600" />
            </a>
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
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setConfirmDelete(true)}
              aria-label="Supprimer la visite"
            >
              <Trash2 className="w-4 h-4" />
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
            {visit.week?.label}
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

      {/* CTA: Marquer comme effectuée */}
      {status !== "done" && (
        <button
          onClick={() => updateStatus("done")}
          disabled={savingStatus}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {savingStatus ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          Marquer comme effectuée
        </button>
      )}

      {/* Tabs */}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors relative ${
              tab === t.id ? "bg-blue-mars text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            } ${t.id !== "visit" ? "border-l border-slate-200 dark:border-slate-600" : ""}`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tab === t.id ? "bg-white/20 text-white" : "bg-blue-mars-light text-blue-mars"}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Visite ── */}
      {tab === "visit" && (
        <div className="space-y-4">
          <VisitInfoCard
            visit={visit}
            mapsUrl={mapsUrl}
            wazeUrl={wazeUrl}
            onUpdate={async (fields) => {
              const ok = await fetchApi("/api/visits", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: visitId, ...fields }),
                suppressToast: true,
              });
              if (ok !== null) {
                showToast("success", "Mis à jour");
              } else {
                showToast("error", "Erreur lors de la mise à jour");
                throw new Error("update failed");
              }
            }}
          />

          <MaterialTypeSelector
            assortment={visit.assortment}
            value={materialType}
            saving={savingMaterial}
            onChange={updateMaterialType}
          />

          {/* ── Notes & Photos divider ── */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-blue-mars" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Notes & Photos</p>
                {(notes.length + photos.length) > 0 && (
                  <span className="text-xs bg-blue-mars-light text-blue-mars px-1.5 py-0.5 rounded-full font-semibold">{notes.length + photos.length}</span>
                )}
              </div>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            <VisitNotes
              notes={notes}
              noteInput={noteInput}
              setNoteInput={setNoteInput}
              addingNote={addingNote}
              onAddNote={addNote}
              onDeleteNote={deleteNote}
            />

            <VisitPhotos
              photos={photos}
              uploadingPhoto={uploadingPhoto}
              selectMode={selectMode}
              selectedPhotos={selectedPhotos}
              sharing={sharing}
              onFileSelect={handleFileSelect}
              onDeletePhoto={deletePhoto}
              onDeleteSelected={deleteSelectedPhotos}
              onShareSelected={shareSelectedPhotos}
              onToggleSelection={togglePhotoSelection}
              onSetSelectMode={setSelectMode}
              onExitSelectMode={exitSelectMode}
              onOpenLightbox={setLightboxUrl}
            />

            {notes.length === 0 && photos.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-6">Aucune note ni photo pour cette visite.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Historique ── */}
      {tab === "history" && (
        <VisitHistory
          history={history}
          historyLoaded={!historyLoading}
          storeName={visit.storeName}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}

      {/* Status confirmation modal */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPendingStatus(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {pendingStatus === "done" ? "Marquer comme effectuée ?" : "Annuler cette visite ?"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {pendingStatus === "done"
                  ? "La visite sera marquée comme effectuée."
                  : "La visite sera marquée comme annulée."}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className={`flex-1 text-white ${pendingStatus === "done" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                onClick={() => { applyStatus(pendingStatus); setPendingStatus(null); }}
              >
                Confirmer
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setPendingStatus(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete note confirmation modal */}
      {confirmDeleteNoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDeleteNoteId(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Supprimer cette note ?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={confirmNoteDelete}>Supprimer</Button>
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteNoteId(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Supprimer cette visite ?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Cette action est irréversible. Les notes et photos seront également supprimées.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  try {
                    await deleteVisit.mutateAsync(visitId);
                    showToast("success", "Visite supprimée");
                    router.push("/planning");
                  } catch {
                    showToast("error", "Erreur lors de la suppression");
                    setConfirmDelete(false);
                  }
                }}
                disabled={deleteVisit.isPending}
              >
                {deleteVisit.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Supprimer"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}