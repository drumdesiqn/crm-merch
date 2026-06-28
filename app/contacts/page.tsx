import nextDynamic from "next/dynamic";
export const dynamic = "force-dynamic";

const ContactsPage = nextDynamic(() => import("@/components/pages/ContactsPage"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-blue-mars border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata = { title: "Contacts — CPM Mars" };

export default function Page() {
  return <ContactsPage />;
}

