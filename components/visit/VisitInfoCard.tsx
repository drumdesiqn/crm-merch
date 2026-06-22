"use client";

import { Calendar, MapPin, User, Tag, Package, AlertCircle, Wrench, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface Visit {
  storeAddress: string;
  storeZipcode: string;
  storeCity: string;
  visitDate: string;
  salesRep: string | null;
  visitFrequence: string | null;
  merchandiser: string | null;
  remarks: string | null;
  materials: string | null;
}

interface VisitInfoCardProps {
  visit: Visit;
  mapsUrl: string;
  wazeUrl: string;
}

export default function VisitInfoCard({ visit, mapsUrl, wazeUrl }: VisitInfoCardProps) {
  return (
    <>
      {/* Consolidated info card */}
      <Card>
        <CardContent className="py-3 space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Date de visite</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">{formatDate(visit.visitDate)}</p>
            </div>
          </div>
          <div className="h-px bg-slate-100 dark:bg-slate-700" />
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Adresse</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.storeAddress}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{visit.storeZipcode} {visit.storeCity}</p>
            </div>
          </div>
          {visit.salesRep && (
            <>
              <div className="h-px bg-slate-100 dark:bg-slate-700" />
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-red-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sales Representative</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.salesRep}</p>
                </div>
              </div>
            </>
          )}
          {visit.visitFrequence && (
            <>
              <div className="h-px bg-slate-100 dark:bg-slate-700" />
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-red-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Type / Fréquence</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.visitFrequence}</p>
                </div>
              </div>
            </>
          )}
          {visit.merchandiser && (
            <>
              <div className="h-px bg-slate-100 dark:bg-slate-700" />
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-red-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Merchandiser</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visit.merchandiser}</p>
                </div>
              </div>
            </>
          )}
          <div className="h-px bg-slate-100 dark:bg-slate-700" />
          <div className="flex gap-2 pt-1">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
              <ExternalLink className="w-4 h-4" /> Google Maps
            </a>
            <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-sm font-medium hover:bg-sky-100 transition-colors">
              <ExternalLink className="w-4 h-4" /> Waze
            </a>
          </div>
        </CardContent>
      </Card>

      {visit.remarks && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-orange-800">
              <AlertCircle className="w-4 h-4" /> Remarques
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <p className="text-sm text-orange-900 whitespace-pre-wrap">{visit.remarks}</p>
          </CardContent>
        </Card>
      )}

      {visit.materials && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-purple-800">
              <Wrench className="w-4 h-4" /> Matériel nécessaire
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <p className="text-sm text-purple-900 whitespace-pre-wrap">{visit.materials}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
