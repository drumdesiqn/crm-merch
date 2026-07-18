"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

const ChatWidget = dynamic(() => import("@/components/ChatWidget"), {
  loading: () => null,
});

export default function AppChrome() {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/login");

  if (isLogin) return null;

  return (
    <>
      <ChatWidget />
      <Navbar />
    </>
  );
}
