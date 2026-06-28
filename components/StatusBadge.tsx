"use client";

import { CheckCircle2, Clock, Ban, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type VisitStatus = "pending" | "done" | "cancelled" | "postponed";

interface StatusBadgeProps {
  status: VisitStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const STATUS_CONFIG: Record<VisitStatus, { 
  label: string; 
  color: string; 
  darkColor: string;
  icon: React.ReactNode 
}> = {
  pending: {
    label: "À faire",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    darkColor: "dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    icon: <Clock className="w-3 h-3" />,
  },
  done: {
    label: "Effectuée",
    color: "bg-green-cpm-light text-green-700 border-green-200",
    darkColor: "dark:bg-green-cpm/20 dark:text-green-cpm dark:border-green-600",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  cancelled: {
    label: "Annulée",
    color: "bg-red-mars-light text-red-mars border-red-200",
    darkColor: "dark:bg-red-mars/20 dark:text-red-400 dark:border-red-800",
    icon: <Ban className="w-3 h-3" />,
  },
  postponed: {
    label: "Reportée",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    darkColor: "dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800",
    icon: <RotateCcw className="w-3 h-3" />,
  },
};

const SIZE_CONFIG = {
  sm: { container: "px-2 py-0.5 text-xs gap-1", icon: "w-3 h-3" },
  md: { container: "px-2.5 py-1 text-sm gap-1.5", icon: "w-4 h-4" },
  lg: { container: "px-3 py-1.5 text-base gap-2", icon: "w-5 h-5" },
};

export function StatusBadge({ status, size = "sm", showLabel = true, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.color,
        config.darkColor,
        sizeConfig.container,
        className
      )}
    >
      <span className={sizeConfig.icon}>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

export function getStatusLabel(status: VisitStatus): string {
  return STATUS_CONFIG[status]?.label || status;
}

export function getStatusColor(status: VisitStatus): string {
  return STATUS_CONFIG[status]?.color || "";
}
