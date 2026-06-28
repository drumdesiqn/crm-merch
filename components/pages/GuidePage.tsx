"use client";

import Image from "next/image";
import { BookOpen } from "lucide-react";

export default function GuidePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-blue-mars dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Guide Matériel</h1>
      </div>
      <div className="rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
        <Image
          src="/guide-materiel.jpg"
          alt="Guide des types de matériel merchandising Mars"
          width={1200}
          height={800}
          className="w-full h-auto object-contain"
          priority
        />
      </div>
      <div className="rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
        <Image
          src="/guide-rack.jpg"
          alt="Exemple de rack M&Ms en magasin"
          width={1200}
          height={800}
          className="w-full h-auto object-contain"
          priority
        />
      </div>
    </div>
  );
}
