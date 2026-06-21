import dynamic from "next/dynamic";

const PlanningPage = dynamic(() => import("@/components/pages/PlanningPage"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata = { title: "Planning — Mars Merch" };

export default function Page() {
  return <PlanningPage />;
}
