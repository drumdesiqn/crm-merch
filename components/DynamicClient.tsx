"use client";

import dynamic from "next/dynamic";
import PageLoader from "./PageLoader";

export const DashboardPage = dynamic(() => import("@/components/pages/DashboardPage"), {
  ssr: false,
  loading: PageLoader,
});

export const PlanningPage = dynamic(() => import("@/components/pages/PlanningPage"), {
  ssr: false,
  loading: PageLoader,
});

export const VisitDetailPage = dynamic(() => import("@/components/pages/VisitDetailPage"), {
  ssr: false,
  loading: PageLoader,
});

export const StoresPage = dynamic(() => import("@/components/pages/StoresPage"), {
  ssr: false,
  loading: PageLoader,
});

export const StoreHistoryPage = dynamic(() => import("@/components/pages/StoreHistoryPage"), {
  ssr: false,
  loading: PageLoader,
});

export const ContactsPage = dynamic(() => import("@/components/pages/ContactsPage"), {
  ssr: false,
  loading: PageLoader,
});

export const MailsPage = dynamic(() => import("@/components/pages/MailsPage"), {
  ssr: false,
  loading: PageLoader,
});

export const GuidePage = dynamic(() => import("@/components/pages/GuidePage"), {
  ssr: false,
  loading: PageLoader,
});

export const ExportPage = dynamic(() => import("@/components/pages/ExportPage"), {
  ssr: false,
  loading: PageLoader,
});

export const SettingsPage = dynamic(() => import("@/components/pages/SettingsPage"), {
  ssr: false,
  loading: PageLoader,
});

export const AnalyticsPage = dynamic(() => import("@/components/pages/AnalyticsPage"), {
  ssr: false,
  loading: PageLoader,
});
