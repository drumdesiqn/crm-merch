"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "warning";
  message: string;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

export function showToast(type: Toast["type"], message: string) {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
  toasts.push({ id, type, message });
  notifyListeners();
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    removeToast(id);
  }, 4000);
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

export default function ToastContainer() {
  const [visibleToasts, setVisibleToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setVisibleToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  if (visibleToasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2">
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/80 dark:border-green-800 dark:text-green-300"
              : toast.type === "error"
              ? "bg-red-mars-light border-red-200 text-red-mars dark:bg-red-950/80 dark:border-red-800 dark:text-red-400"
              : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : toast.type === "error" ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
