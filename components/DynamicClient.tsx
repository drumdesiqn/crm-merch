"use client";

import dynamic from "next/dynamic";

export const DashboardPage = dynamic(
  () => import("@/components/pages/DashboardPage"),
  { ssr: false }
);

export const PlanningPage = dynamic(
  () => import("@/components/pages/PlanningPage"),
  { ssr: false }
);

export const VisitDetailPage = dynamic(
  () => import("@/components/pages/VisitDetailPage"),
  { ssr: false }
);

export const StoresPage = dynamic(
  () => import("@/components/pages/StoresPage"),
  { ssr: false }
);

export const StoreHistoryPage = dynamic(
  () => import("@/components/pages/StoreHistoryPage"),
  { ssr: false }
);

export const MailsPage = dynamic(
  () => import("@/components/pages/MailsPage"),
  { ssr: false }
);

export const SettingsPage = dynamic(
  () => import("@/components/pages/SettingsPage"),
  { ssr: false }
);

export const ContactsPage = dynamic(
  () => import("@/components/pages/ContactsPage"),
  { ssr: false }
);

export const GuidePage = dynamic(
  () => import("@/components/pages/GuidePage"),
  { ssr: false }
);

export const ExportPage = dynamic(
  () => import("@/components/pages/ExportPage"),
  { ssr: false }
);

export const AnalyticsPage = dynamic(
  () => import("@/components/pages/AnalyticsPage"),
  { ssr: false }
);

export const AssistantPage = dynamic(
  () => import("@/components/pages/AssistantPage"),
  { ssr: false }
);
