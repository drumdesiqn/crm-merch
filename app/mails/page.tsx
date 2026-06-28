import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const MailsPage = nextDynamic(() => import("@/components/pages/MailsPage").then(m => ({ default: m.default })), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default MailsPage;
