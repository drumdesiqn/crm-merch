import nextDynamic from "next/dynamic";
export const dynamic = "force-dynamic";

const SettingsPage = nextDynamic(() => import("@/components/pages/SettingsPage"), {
  loading: () => <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>,
});

export default function Page() {
  return <SettingsPage />;
}

