import dynamic from "next/dynamic";

const GuidePage = dynamic(() => import("@/components/pages/GuidePage"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata = { title: "Guide Matériel — Mars Merch" };

export default function Page() {
  return <GuidePage />;
}
