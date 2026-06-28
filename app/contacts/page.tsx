import dynamic from "next/dynamic";

const ContactsPage = dynamic(() => import("@/components/pages/ContactsPage"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata = { title: "Contacts — Mars Merch" };

export default function Page() {
  return <ContactsPage />;
}
