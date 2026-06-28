"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

interface Props {
  value: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function FrenchDatePicker({ value, onChange }: Props) {
  const initial = value ? parseYMD(value) : new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const selected = value ? parseYMD(value) : null;

  const days = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    // Monday-based: 0=Mon … 6=Sun
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const cells: (number | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const prevMonth = () => {
    setView((v) => {
      const m = v.month - 1;
      return m < 0 ? { year: v.year - 1, month: 11 } : { ...v, month: m };
    });
  };
  const nextMonth = () => {
    setView((v) => {
      const m = v.month + 1;
      return m > 11 ? { year: v.year + 1, month: 0 } : { ...v, month: m };
    });
  };

  const today = toYMD(new Date());

  return (
    <div className="w-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">
          {MOIS[view.month]} {view.year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Mois suivant"
        >
          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {JOURS.map((j) => (
          <div key={j} className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 py-1">
            {j}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isSelected = dateStr === value;
          const isToday = dateStr === today;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(dateStr)}
              className={[
                "mx-auto flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                isSelected
                  ? "bg-blue-600 text-white"
                  : isToday
                  ? "border border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
              ].join(" ")}
              aria-label={dateStr}
              aria-pressed={isSelected}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
