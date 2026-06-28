import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const StoresPage = nextDynamic(() => import("@/components/pages/StoresPage"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata = { title: "Magasins — Mars Merch" };

export default function Page() {
  return <StoresPage />;
}
