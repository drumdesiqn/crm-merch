"use client";

import Image from "next/image";
import { BookOpen } from "lucide-react";

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Référence</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Guide Matériel</h1>
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#2e2e30]">
        <Image
          src="/guide-materiel.jpg"
          alt="Guide des types de matériel merchandising Mars"
          width={1200}
          height={800}
          className="w-full h-auto object-contain"
          priority
        />
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#2e2e30]">
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
