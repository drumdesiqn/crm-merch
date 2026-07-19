"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, Store, Loader2, Printer, Download, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, escapeHtml } from "@/lib/utils";
import { PDF_BASE_STYLES, pdfInfoBox, pdfPhotoItem, pdfCategorizedPhotoItem, pdfNoteItem, pdfFooter, pdfBatchDocument } from "@/lib/pdf-template";
import { showToast } from "@/components/Toast";
import { useWeeks } from "@/lib/hooks/useWeeks";
import { useExportVisits } from "@/lib/hooks/useExportVisits";

export default function ExportPage() {
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedVisit, setSelectedVisit] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  const { data: weeks = [] } = useWeeks();
  const { data: visits = [], isLoading: loading } = useExportVisits(selectedWeek);

  const selectWeek = (weekId: string) => {
    setSelectedWeek(weekId);
    setSelectedVisit("");
  };

  const generatePDF = async () => {
    if (!selectedVisit) return;
    const visit = visits.find((v) => v.id === selectedVisit);
    if (!visit) return;

    setGenerating(true);

    // Create print window (with iframe fallback for popup blockers)
    let printWindow = window.open("", "_blank");
    if (!printWindow) {
      // Fallback: use a hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);
      printWindow = iframe.contentWindow;
      if (!printWindow) {
        showToast("error", "Impossible d'ouvrir la fenêtre d'impression. Autorisez les popups.");
        setGenerating(false);
        iframe.remove();
        return;
      }
      // Clean up iframe after printing
      iframe.contentWindow?.addEventListener("afterprint", () => iframe.remove());
      setTimeout(() => iframe.remove(), 30000);
    }

    const photosHtml = visit.photos.map((photo) => pdfCategorizedPhotoItem(photo.url, photo.category)).join("");

    const notesHtml = visit.notes.length
      ? visit.notes.map((note) => pdfNoteItem(note.content, note.createdAt)).join("")
      : '<p class="no-content">Aucune note</p>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport visite - ${escapeHtml(visit.storeName)}</title>
        <style>${PDF_BASE_STYLES}</style>
      </head>
      <body>
        <div class="brand-bar">
          <div>
            <div class="brand-title">Rapport de Visite</div>
            <div class="brand-sub">CPM Mars · ${formatDate(visit.visitDate)}</div>
          </div>
          <span class="status-badge status-${visit.status}">${visit.status === "done" ? "Effectué" : visit.status === "cancelled" ? "Annulé" : visit.status === "postponed" ? "Reporté" : "En attente"}</span>
        </div>

        <div class="visit-header" style="border-bottom: 2px solid #003478; margin-bottom: 20px; padding-bottom: 14px;">
          <div>
            <h1 style="color: #003478; margin: 0; font-size: 22px; font-weight: 800;">${escapeHtml(visit.storeName)}</h1>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">${escapeHtml(visit.storeAddress)}, ${escapeHtml(visit.storeZipcode)} ${escapeHtml(visit.storeCity)}</p>
          </div>
        </div>

        <div class="info-grid">
          ${pdfInfoBox("Type", visit.visitType)}
          ${visit.materialType ? pdfInfoBox("Matériel", visit.materialType) : ""}
          ${visit.salesRep ? pdfInfoBox("Sales Rep", visit.salesRep) : ""}
        </div>

        <div class="section">
          <h2>Remarques</h2>
          <p>${visit.remarks ? escapeHtml(visit.remarks).replace(/\n/g, "<br>") : "Aucune remarque"}</p>
        </div>

        <div class="section">
          <h2>Matériel</h2>
          <p>${visit.materials ? escapeHtml(visit.materials).replace(/\n/g, "<br>") : "Non spécifié"}</p>
        </div>

        <div class="section">
          <h2>Notes (${visit.notes.length})</h2>
          ${notesHtml}
        </div>

        <div class="section">
          <h2>Photos (${visit.photos.length})</h2>
          <div class="photos-grid">
            ${photosHtml}
          </div>
        </div>

        ${pdfFooter()}
      </body>
      </html>
    `);

    printWindow.document.close();
    setGenerating(false);
  };

  const exportToExcel = async () => {
    if (visits.length === 0) return;

    const XLSX = await import("xlsx");

    const exportData = visits.map((visit) => ({
      Date: formatDate(visit.visitDate),
      Magasin: visit.storeName,
      Adresse: `${visit.storeAddress}, ${visit.storeZipcode} ${visit.storeCity}`,
      Type: visit.visitType,
      Statut: visit.status,
      Remarques: visit.remarks || "",
      Matériel: visit.materials || "",
      "Type Matériel": visit.materialType || "",
      Notes: visit.notes.map((n) => n.content).join("; "),
      "Nombre Photos": visit.photos.length,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visites");
    
    const weekLabel = weeks.find((w) => w.id === selectedWeek)?.label || "export";
    XLSX.writeFile(wb, `visites-${weekLabel}.xlsx`);
  };

  const exportToCSV = async () => {
    if (visits.length === 0) return;

    const XLSX = await import("xlsx");

    const exportData = visits.map((visit) => ({
      Date: formatDate(visit.visitDate),
      Magasin: visit.storeName,
      Adresse: `${visit.storeAddress}, ${visit.storeZipcode} ${visit.storeCity}`,
      Type: visit.visitType,
      Statut: visit.status,
      Remarques: visit.remarks || "",
      Matériel: visit.materials || "",
      "Type Matériel": visit.materialType || "",
      Notes: visit.notes.map((n) => n.content).join("; "),
      "Nombre Photos": visit.photos.length,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const weekLabel = weeks.find((w) => w.id === selectedWeek)?.label || "export";
    link.setAttribute("href", url);
    link.setAttribute("download", `visites-${weekLabel}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateBatchPDF = () => {
    if (visits.length === 0) return;
    setGeneratingBatch(true);

    const weekLabel = weeks.find((w) => w.id === selectedWeek)?.label || "Semaine";
    const html = pdfBatchDocument(
      visits.map((v) => ({
        ...v,
        photos: v.photos.map((p) => ({ url: p.url, category: p.category })),
        notes: v.notes.map((n) => ({ content: n.content, createdAt: n.createdAt })),
      })),
      weekLabel,
    );

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("error", "Popup bloquée — autorisez les popups");
      setGeneratingBatch(false);
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    showToast("success", `PDF ${visits.length} visites ouvert`);
    setGeneratingBatch(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="outline" size="icon" aria-label="Retour">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Export PDF</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Générer un rapport par visite</p>
        </div>
      </div>

      {/* Week selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-teal-cpm" />
            1. Choisir une semaine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 max-h-40 overflow-y-auto">
            {weeks.map((week) => (
              <button
                key={week.id}
                onClick={() => selectWeek(week.id)}
                className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                  selectedWeek === week.id
                    ? "border-teal-cpm bg-teal-cpm/10 dark:bg-teal-cpm/15"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="font-medium text-slate-900 dark:text-slate-100">{week.label}</span>
                {selectedWeek === week.id && (
                  <div className="w-4 h-4 rounded-full bg-teal-cpm flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visit selector */}
      {selectedWeek && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="w-4 h-4 text-teal-cpm" />
              2. Choisir une visite
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            )}
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {visits.map((visit) => (
                <button
                  key={visit.id}
                  onClick={() => setSelectedVisit(visit.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedVisit === visit.id
                      ? "border-teal-cpm bg-teal-cpm/10 dark:bg-teal-cpm/15"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{visit.storeName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(visit.visitDate)} · {visit.visitType}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {visit.photos.length} photo{visit.photos.length !== 1 ? "s" : ""} · {visit.notes.length} note{visit.notes.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {selectedVisit === visit.id && (
                    <div className="w-4 h-4 rounded-full bg-teal-cpm flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate PDF */}
      {selectedVisit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-teal-cpm" />
              3. Générer le PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Le rapport inclura toutes les informations de la visite avec les photos et notes.
            </p>
            <Button
              className="w-full bg-teal-cpm hover:bg-teal-cpm/85 text-white"
              onClick={generatePDF}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Préparation...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Ouvrir / Imprimer PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Export Excel/CSV */}
      {selectedWeek && visits.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="w-4 h-4 text-teal-cpm" />
              Exporter toutes les visites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Exporter toutes les visites de la semaine sélectionnée au format Excel ou CSV.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={exportToExcel}
              >
                <Download className="w-4 h-4 mr-2" />
                Excel (.xlsx)
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={exportToCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV (.csv)
              </Button>
            </div>
            <Button
              className="w-full bg-teal-cpm hover:bg-teal-cpm/85 text-white mt-3"
              onClick={generateBatchPDF}
              disabled={generatingBatch}
            >
              {generatingBatch ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Préparation…
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  PDF Semaine complète ({visits.length} visites)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <p className="text-xs text-slate-400 text-center">
        Le PDF s&apos;ouvre dans une nouvelle fenêtre. Utilisez &quot;Imprimer&quot; puis &quot;Enregistrer au format PDF&quot; pour sauvegarder.
      </p>
    </div>
  );
}