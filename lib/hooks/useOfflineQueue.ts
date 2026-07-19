"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/Toast";

const QUEUE_KEY = "mars-offline-queue";

interface QueuedAction {
  id: string;
  type: "visit-status";
  visitId: string;
  status: string;
  timestamp: number;
}

function readQueue(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedAction[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function useOfflineQueue() {
  const queryClient = useQueryClient();

  const flushQueue = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0) return;

    const remaining: QueuedAction[] = [];
    let flushed = 0;

    for (const action of queue) {
      try {
        const res = await fetch("/api/visits", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: action.visitId, status: action.status }),
        });
        if (res.ok) {
          flushed++;
        } else {
          remaining.push(action);
        }
      } catch {
        remaining.push(action);
      }
    }

    writeQueue(remaining);

    if (flushed > 0) {
      showToast("success", `${flushed} action(s) synchronisée(s)`);
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    }
  }, [queryClient]);

  const enqueueStatusChange = useCallback((visitId: string, status: string) => {
    const queue = readQueue();
    // Remove any existing action for the same visit
    const filtered = queue.filter((q) => q.visitId !== visitId);
    filtered.push({
      id: `${visitId}-${Date.now()}`,
      type: "visit-status" as const,
      visitId,
      status,
      timestamp: Date.now(),
    });
    writeQueue(filtered);
  }, []);

  const getQueuedStatus = useCallback((visitId: string): string | null => {
    const queue = readQueue();
    const action = queue.find((q) => q.visitId === visitId);
    return action ? action.status : null;
  }, []);

  const getQueueCount = useCallback((): number => {
    return readQueue().length;
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      flushQueue();
    };
    window.addEventListener("online", handleOnline);
    // Also try flushing on mount (in case we came back online while page was closed)
    if (navigator.onLine) {
      flushQueue();
    }
    return () => window.removeEventListener("online", handleOnline);
  }, [flushQueue]);

  return { enqueueStatusChange, getQueuedStatus, getQueueCount, flushQueue };
}
