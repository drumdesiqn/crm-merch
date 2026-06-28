"use client";

import nextDynamic from "next/dynamic";
export const dynamic = "force-dynamic";

const AnalyticsPage = nextDynamic(() => import("@/components/pages/AnalyticsPage"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function Page() {
  return <AnalyticsPage />;
}

