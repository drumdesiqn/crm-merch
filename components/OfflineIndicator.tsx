"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { showToast } from "@/components/Toast";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showSync, setShowSync] = useState(false);

  useEffect(() => {
    // Initial state
    setOnline(navigator.onLine);

    // Online/offline handlers
    const handleOnline = () => {
      setOnline(true);
      requestSync();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Service worker message handler
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "PENDING_COUNT") {
        setPendingCount(event.data.count);
      }
      if (event.data.type === "PENDING_ACTIONS_UPDATED") {
        setPendingCount(event.data.count);
      }
      if (event.data.type === "SYNC_COMPLETE") {
        const synced = pendingCount - (event.data.remaining || 0);
        setPendingCount(event.data.remaining);
        setShowSync(false);
        if (synced > 0) {
          showToast("success", `${synced} action${synced > 1 ? "s" : ""} synchronisée${synced > 1 ? "s" : ""} avec succès`);
        }
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);

    // Check pending on mount
    checkPendingActions();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []);

  const requestSync = async () => {
    if (!navigator.serviceWorker?.controller) return;
    
    // Trigger background sync
    try {
      const registration = await navigator.serviceWorker.ready;
      // Use type assertion for background sync API
      const syncReg = registration as any;
      if (syncReg.sync?.register) {
        await syncReg.sync.register("sync-pending-actions");
      } else {
        // Fallback: manual sync
        navigator.serviceWorker.controller.postMessage({ type: "SYNC_NOW" });
      }
    } catch {
      // Fallback: manual sync
      navigator.serviceWorker.controller.postMessage({ type: "SYNC_NOW" });
    }
    setShowSync(true);
  };

  const checkPendingActions = async () => {
    // Query service worker for pending count
    if (!navigator.serviceWorker?.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: "GET_PENDING_COUNT" });
  };

  // Don't show anything if online and no pending actions
  if (online && pendingCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {!online && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
          <WifiOff className="w-4 h-4" />
          <span>Mode hors ligne - Les actions seront synchronisées à la reconnexion</span>
        </div>
      )}
      {online && pendingCount > 0 && (
        <button
          onClick={requestSync}
          disabled={showSync}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${showSync ? "animate-spin" : ""}`} />
          <span>
            {showSync 
              ? "Synchronisation..." 
              : `${pendingCount} action${pendingCount > 1 ? "s" : ""} en attente - Cliquer pour synchroniser`}
          </span>
        </button>
      )}
    </div>
  );
}
