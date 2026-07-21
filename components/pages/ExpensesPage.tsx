"use client";

import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import { ArrowLeft, Camera, Receipt, Trash2, FileDown, CheckSquare, Square, X, Loader2, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExpenses, useCreateExpense, useDeleteExpense, useUpdateExpense } from "@/lib/hooks/useExpenses";
import { compressImage, formatDate } from "@/lib/utils";
import { showToast } from "@/components/Toast";
import { pdfExpenseDocument } from "@/lib/pdf-template";

export default function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const updateExpense = useUpdateExpense();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const selectedExpenses = useMemo(
    () => expenses.filter((e) => selectedIds.has(e.id)),
    [expenses, selectedIds]
  );

  const selectedTotal = useMemo(
    () => selectedExpenses.reduce((sum, e) => sum + e.amount, 0),
    [selectedExpenses]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 });
      setSelectedFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch {
      showToast("error", "Erreur lors du traitement de l'image");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const formData = new FormData();
    formData.append("description", description.trim());
    formData.append("amount", amount);
    formData.append("expenseDate", expenseDate);
    if (selectedFile) formData.append("file", selectedFile);

    try {
      await createExpense.mutateAsync(formData);
      setDescription("");
      setAmount("");
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch {
      // handled by mutation
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)));
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    try {
      await deleteExpense.mutateAsync(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      // handled
    }
  };

  const handleExport = async () => {
    if (selectedExpenses.length === 0) {
      showToast("error", "Sélectionne au moins une dépense");
      return;
    }
    setExporting(true);
    try {
      pdfExpenseDocument(selectedExpenses);
      // Mark as exported
      await Promise.all(
        selectedExpenses.map((e) =>
          updateExpense.mutateAsync({ id: e.id, exported: true })
        )
      );
      showToast("success", "PDF généré et dépenses marquées comme exportées");
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch {
      showToast("error", "Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <a href="/" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Notes de frais</h1>
          <p className="text-sm text-slate-500">{expenses.length} dépense{expenses.length > 1 ? "s" : ""} · {totalAmount.toFixed(2)} €</p>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Montant (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Essence, parking, repas..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              id="receipt-photo-input"
            />
            <label
              htmlFor="receipt-photo-input"
              className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Ticket
            </label>
          </div>
        </div>
        {previewUrl && (
          <div className="relative inline-block">
            <Image src={previewUrl} alt="Aperçu ticket" width={120} height={120} className="rounded-lg object-cover" unoptimized />
            <button
              type="button"
              onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <Button
          type="submit"
          disabled={createExpense.isPending || !description.trim() || !amount}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white"
        >
          {createExpense.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter la dépense"}
        </Button>
      </form>

      {/* Actions bar */}
      {expenses.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setSelectMode(!selectMode);
              setSelectedIds(new Set());
            }}
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            {selectMode ? "Annuler la sélection" : "Sélectionner pour export"}
          </button>
          {selectMode && (
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="text-sm text-slate-500 hover:text-slate-700">
                {selectedIds.size === expenses.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
              <Button
                onClick={handleExport}
                disabled={exporting || selectedIds.size === 0}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Exporter PDF{selectedIds.size > 0 && ` (${selectedTotal.toFixed(2)} €)`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Expense list */}
      <div className="space-y-2">
        {expenses.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucune dépense pour le moment</p>
            <p className="text-xs mt-1">Ajoute ta première dépense ci-dessus</p>
          </div>
        )}
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className={`flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#1a1a1b] border transition-colors ${
              selectMode && selectedIds.has(expense.id)
                ? "border-teal-500 bg-teal-50 dark:bg-teal-950/20"
                : "border-slate-200 dark:border-[#2e2e30]"
            }`}
          >
            {selectMode && (
              <button onClick={() => toggleSelection(expense.id)} className="shrink-0">
                {selectedIds.has(expense.id) ? (
                  <CheckSquare className="w-5 h-5 text-teal-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </button>
            )}
            {expense.receiptUrl ? (
              <button
                onClick={() => setLightboxUrl(expense.receiptUrl)}
                className="shrink-0"
              >
                <Image
                  src={expense.receiptUrl}
                  alt="Ticket"
                  width={48}
                  height={48}
                  className="rounded-lg object-cover w-12 h-12"
                  unoptimized
                />
              </button>
            ) : (
              <div className="shrink-0 w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {expense.description}
              </p>
              <p className="text-xs text-slate-500">
                {formatDate(expense.expenseDate)}
                {expense.exportedAt && (
                  <span className="ml-2 text-teal-600 font-medium">· Exporté</span>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {expense.amount.toFixed(2)} €
              </p>
            </div>
            {!selectMode && (
              <button
                onClick={() => setConfirmDeleteId(expense.id)}
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white dark:bg-[#1a1a1b] rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-4">Supprimer cette dépense ?</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="flex-1">Annuler</Button>
              <Button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Supprimer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setLightboxUrl(null)}>
            <X className="w-6 h-6" />
          </button>
          <Image src={lightboxUrl} alt="Ticket" width={800} height={800} className="max-w-full max-h-full object-contain" unoptimized />
        </div>
      )}
    </div>
  );
}
