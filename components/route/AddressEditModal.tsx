"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { GeocodedVisit } from "./types";

export function AddressEditModal({
  editingVisit,
  editAddress,
  setEditAddress,
  onSave,
  onClose,
  saving,
}: {
  editingVisit: GeocodedVisit;
  editAddress: { address: string; zipcode: string; city: string };
  setEditAddress: (val: { address: string; zipcode: string; city: string }) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-5 w-full max-w-sm space-y-4 border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
          Modifier l&apos;adresse — {editingVisit.storeName}
        </h3>
        <div className="space-y-2">
          <input
            value={editAddress.address}
            onChange={(e) => setEditAddress({ ...editAddress, address: e.target.value })}
            placeholder="Adresse"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <div className="flex gap-2">
            <input
              value={editAddress.zipcode}
              onChange={(e) => setEditAddress({ ...editAddress, zipcode: e.target.value })}
              placeholder="Code postal"
              className="w-24 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            <input
              value={editAddress.city}
              onChange={(e) => setEditAddress({ ...editAddress, city: e.target.value })}
              placeholder="Ville"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? "..." : "Sauvegarder"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
