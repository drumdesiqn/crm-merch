import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ToastContainer from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import dynamic from "next/dynamic";

const ChatWidget = dynamic(() => import("@/components/ChatWidget"), {
  loading: () => null,
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CPM Mars — Mon Planning",
  description: "Application de gestion pour merchandisers CPM chez Mars",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CPM Mars",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <meta name="theme-color" content="#0010A4" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#111827" media="(prefers-color-scheme: dark)" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full bg-slate-50 dark:bg-slate-900 font-sans transition-colors">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-mars focus:text-white focus:rounded-lg focus:text-sm focus:font-medium">
          Aller au contenu
        </a>
        <ReactQueryProvider>
          <ThemeProvider>
            <ToastContainer />
            <ChatWidget />
            <Navbar />
            <main id="main-content" className="pt-[env(safe-area-inset-top)] md:pt-14 pb-20 md:pb-4 min-h-screen">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
