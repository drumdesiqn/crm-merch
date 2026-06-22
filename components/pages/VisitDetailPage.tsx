"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, History, StickyNote, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VISIT_TYPE_COLORS, ASSORTMENT_COLORS, compressImage, escapeHtml, VisitStatus } from "@/lib/utils";
import { PDF_BASE_STYLES, pdfPhotoItem, pdfNoteItem, pdfFooter } from "@/lib/pdf-template";
import { showToast } from "@/components/Toast";
import { STATUS_CONFIG } from "@/components/StatusBadge";
import type { Visit, VisitNote, VisitPhoto, StoreHistoryVisit } from "@/types/visit";
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
  // History state
  const [history, setHistory] = useState<StoreHistoryVisit[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const visitId = params?.id as string;

  useEffect(() => {
    if (!visitId) return;
    fetch(`/api/visits/${visitId}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "not_found" : "server_error");
        return r.json();
      })
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
      .catch((err) => {
        setVisit(null);
        setLoading(false);
        if (err?.message !== "not_found") {
          showToast("error", "Erreur lors du chargement de la visite");
        }
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
        if (Array.isArray(d)) setHistory(d.filter((v: StoreHistoryVisit) => v.id !== visitId));
        setHistoryLoaded(true);
      })
      .catch(() => {
        showToast("error", "Erreur lors du chargement de l'historique");
        setHistoryLoaded(true);
      });
  }, [historyLoaded, visit?.storeId, visitId]);

  const addNote = async () => {
    if (!noteInput.trim()) return;
    const tempNote: VisitNote = {
      id: `temp-${Date.now()}`,
      content: noteInput.trim(),
      createdAt: new Date().toISOString(),
      visitId,
      storeId: visit?.storeId || null,
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
    if (!window.confirm("Supprimer cette note ?")) return;

    const previousNotes = [...notes];
    
    // Optimistic update
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    
    try {
      const res = await fetch(`/api/visits/${visitId}/notes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      if (!res.ok) throw new Error("Server error");
      showToast("success", "Note supprimée");
    } catch {
      // Revert on error
      setNotes(previousNotes);
      showToast("error", "Erreur lors de la suppression");
    }
  };

  const handleFileSelect = async (file: File) => {
    const tempPhoto: VisitPhoto = {
      id: `temp-${Date.now()}`,
      url: URL.createObjectURL(file),
      caption: null,
      createdAt: new Date().toISOString(),
      visitId,
      storeId: visit?.storeId || null,
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
      setPhotos((prev) => prev.filter((p) => p.id !== tempPhoto.id));
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
      const photosHtml = v.photos.map((p: {url: string, caption?: string}) =>
        pdfPhotoItem(p.url, p.caption)
      ).join("");
      
      const notesHtml = v.notes.map((n: {content: string, createdAt: string}) =>
        pdfNoteItem(n.content, n.createdAt)
      ).join("");
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Rapport de visite - ${escapeHtml(v.storeName)}</title>
          <style>
            ${PDF_BASE_STYLES}
            h1 { color: #dc2626; margin-bottom: 5px; }
            .header { border-bottom: 2px solid #dc2626; padding-bottom: 15px; margin-bottom: 20px; }
            .info-item { padding: 8px; background: #f9fafb; border-radius: 6px; }
            .info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
            .info-value { font-size: 14px; font-weight: 500; margin-top: 2px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; margin-right: 5px; }
            .badge-red { background: #fee2e2; color: #dc2626; }
            .badge-blue { background: #dbeafe; color: #2563eb; }
            .badge-gray { background: #f3f4f6; color: #6b7280; }
            .section-title { font-size: 16px; font-weight: 600; color: #dc2626; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
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
              <div class="info-value">${escapeHtml(v.materialType)}</div>
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

    // Optimistic update
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));

    try {
      const res = await fetch(`/api/visits/${visitId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      if (!res.ok) throw new Error("Server error");
      showToast("success", "Photo supprimée");
    } catch {
      // Revert on error
      setPhotos(previousPhotos);
      showToast("error", "Erreur lors de la suppression");
    }
  };

  const deleteSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`Supprimer ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? "s" : ""} ?`)) return;
    
    const ids = Array.from(selectedPhotos);
    const results = await Promise.allSettled(
      ids.map((photoId) =>
        fetch(`/api/visits/${visitId}/photos`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId }),
        }).then((res) => {
          if (!res.ok) throw new Error("Server error");
          return photoId;
        })
      )
    );
    const deletedIds = new Set(
      results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<string>).value)
    );
    setPhotos((prev) => prev.filter((p) => !deletedIds.has(p.id)));
    exitSelectMode();
    if (deletedIds.size > 0) {
      showToast("success", `${deletedIds.size} photo${deletedIds.size > 1 ? "s" : ""} supprimée${deletedIds.size > 1 ? "s" : ""}`);
    }
    if (deletedIds.size < ids.length) {
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
          <VisitInfoCard visit={visit} mapsUrl={mapsUrl} wazeUrl={wazeUrl} />

          <MaterialTypeSelector
            assortment={visit.assortment}
            value={materialType}
            saving={savingMaterial}
            onChange={updateMaterialType}
          />

          {/* ── Notes & Photos divider ── */}
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
          historyLoaded={historyLoaded}
          storeName={visit.storeName}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}
