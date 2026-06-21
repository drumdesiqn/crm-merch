import type { VisitStatus } from "@/lib/utils";

export interface Visit {
  id: string;
  assortment: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeZipcode: string;
  storeCity: string;
  visitType: string;
  visitFrequence: string | null;
  visitDate: string;
  merchandiser: string | null;
  remarks: string | null;
  salesRep: string | null;
  materials: string | null;
  materialType: string | null;
  sortOrder: number;
  status: VisitStatus | string;
  week?: { label: string };
}

export interface Week {
  id: string;
  label: string;
  weekNum: number;
  year: number;
  _count: { visits: number };
}

export interface VisitNote {
  id: string;
  content: string;
  createdAt: string;
  visitId: string;
  storeId: string | null;
  visit?: { visitDate: string; week: { label: string } } | null;
}

export interface VisitPhoto {
  id: string;
  url: string;
  blobKey: string;
  caption: string | null;
  createdAt: string;
  visitId: string;
  storeId: string | null;
  visit?: { visitDate: string; week: { label: string } } | null;
}
