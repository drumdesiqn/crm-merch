"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, MapPin, Store, Loader2, Printer, Download, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";

interface Week {
  id: string;
  label: string;
  year: number;
  weekNum: number;
}

interface Visit {
  id: string;
  visitDate: string;
  storeName: string;
  storeCity: string;
  storeAddress: string;
  storeZipcode: string;
  visitType: string;
  status: string;
  merchandiser: string | null;
  remarks: string | null;
  materials: string | null;
  materialType: string | null;
  photos: { id: string; url: string }[];
  notes: { content: string; createdAt: string }[];
}

export default function ExportPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/weeks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWeeks(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedWeek) {
      setVisits([]);
      return;
    }
    setLoading(true);
    fetch(`/api/export?weekId=${selectedWeek}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.visits) {
          setVisits(data.visits);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedWeek]);

  const generatePDF = async () => {
    if (!selectedVisit) return;
    const visit = visits.find((v) => v.id === selectedVisit);
    if (!visit) return;

    setGenerating(true);

    // Create print window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Veuillez autoriser les popups pour générer le PDF");
      setGenerating(false);
      return;
    }

    const photosHtml = visit.photos
      .map(
        (photo) => `
      <div style="break-inside: avoid; margin-bottom: 20px;">
        <img src="${photo.url}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #e2e8f0;" />
      </div>
    `
      )
      .join("");

    const notesHtml = visit.notes.length
      ? visit.notes
          .map(
            (note) => `
        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #dc2626;">
          <p style="margin: 0; color: #334155; font-size: 14px;">${note.content}</p>
          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">${new Date(note.createdAt).toLocaleDateString("fr-BE")}</p>
        </div>
      `
          )
          .join("")
      : '<p style="color: #94a3b8; font-style: italic;">Aucune note</p>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport visite - ${visit.storeName}</title>
        <style>
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #dc2626; }
          .header h1 { color: #dc2626; margin: 0 0 10px; font-size: 24px; }
          .header p { color: #64748b; margin: 0; font-size: 14px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
          .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
          .info-box label { display: block; color: #64748b; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
          .info-box value { display: block; color: #1e293b; font-size: 16px; font-weight: 600; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #dc2626; font-size: 18px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
          .photos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .status-pending { background: #fef3c7; color: #d97706; }
          .status-done { background: #d1fae5; color: #059669; }
          .status-cancelled { background: #fee2e2; color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rapport de Visite</h1>
          <p>${formatDate(visit.visitDate)}</p>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <label>Magasin</label>
            <value>${visit.storeName}</value>
          </div>
          <div class="info-box">
            <label>Type</label>
            <value>${visit.visitType}</value>
          </div>
          <div class="info-box">
            <label>Adresse</label>
            <value>${visit.storeAddress}, ${visit.storeZipcode} ${visit.storeCity}</value>
          </div>
          <div class="info-box">
            <label>Statut</label>
            <value>
              <span class="status-badge status-${visit.status}">${visit.status}</span>
            </value>
          </div>
        </div>

        <div class="section">
          <h2>📝 Remarques</h2>
          <p>${visit.remarks || "Aucune remarque"}</p>
        </div>

        <div class="section">
          <h2>🛠️ Matériel</h2>
          <p>${visit.materials || "Non spécifié"}</p>
        </div>

        <div class="section">
          <h2>📋 Notes (${visit.notes.length})</h2>
          ${notesHtml}
        </div>

        <div class="section">
          <h2>📷 Photos (${visit.photos.length})</h2>
          <div class="photos-grid">
            ${photosHtml}
          </div>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
          Généré par Mars Merch le ${new Date().toLocaleDateString("fr-BE")}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
    setGenerating(false);
  };

  const exportToExcel = () => {
    if (visits.length === 0) return;

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

  const exportToCSV = () => {
    if (visits.length === 0) return;

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="outline" size="icon">
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
            <Calendar className="w-4 h-4 text-red-600" />
            1. Choisir une semaine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 max-h-40 overflow-y-auto">
            {weeks.map((week) => (
              <button
                key={week.id}
                onClick={() => {
                  setSelectedWeek(week.id);
                  setSelectedVisit("");
                }}
                className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                  selectedWeek === week.id
                    ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="font-medium text-slate-900 dark:text-slate-100">{week.label}</span>
                {selectedWeek === week.id && (
                  <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
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
              <Store className="w-4 h-4 text-red-600" />
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
                      ? "border-red-500 bg-red-50 dark:bg-red-950/30"
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
                    <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-0.5">
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
              <FileText className="w-4 h-4 text-red-600" />
              3. Générer le PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Le rapport inclura toutes les informations de la visite avec les photos et notes.
            </p>
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
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
              <FileSpreadsheet className="w-4 h-4 text-red-600" />
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
