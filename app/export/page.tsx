import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const ExportPage = nextDynamic(() => import("@/components/pages/ExportPage"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-blue-mars border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata = { title: "Export — CPM Mars" };

export default function Page() {
  return <ExportPage />;
}
