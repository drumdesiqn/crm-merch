"use client";

import { useEffect, useState } from "react";
import { WifiOff, CloudUpload } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useOfflineQueue } from "@/lib/hooks/useOfflineQueue";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { getQueueCount } = useOfflineQueue();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const updateCount = () => setQueueCount(getQueueCount());
    updateCount();
    const interval = setInterval(updateCount, 2000);
    window.addEventListener("online", updateCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", updateCount);
    };
  }, [getQueueCount]);

  if (isOnline && queueCount === 0) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[60] px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-transform ${
        isOnline
          ? "bg-blue-600 text-white"
          : "bg-amber-500 text-white"
      }`}
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      {isOnline ? (
        <>
          <CloudUpload className="w-4 h-4 animate-pulse" />
          Synchronisation de {queueCount} action{queueCount > 1 ? "s" : ""} en attente...
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          Hors ligne — les changements seront synchronisés au retour de la connexion
          {queueCount > 0 && ` (${queueCount} en attente)`}
        </>
      )}
    </div>
  );
}
