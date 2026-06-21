"use client";

import { BookOpen } from "lucide-react";

export default function GuidePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-red-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Guide Matériel</h1>
      </div>
      <div className="rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
        <img
          src="/guide-materiel.jpg"
          alt="Guide des types de matériel merchandising Mars"
          className="w-full h-auto object-contain"
        />
      </div>
    </div>
  );
}
