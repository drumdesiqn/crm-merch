"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, Calendar, BarChart3, Settings, Sun, Moon, Users, BookOpen, MoreHorizontal, Store, Camera } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { installAuthInterceptor } from "@/lib/fetch-auth";

// Navigation principale (3 items max pour mobile)
const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/planning", icon: Calendar, label: "Planning" },
  { href: "/contacts", icon: Users, label: "Contacts" },
];

// Items dans le menu "Plus" (mobile)
const MORE_ITEMS = [
  { href: "/stores", icon: Store, label: "Magasins" },
  { href: "/photos", icon: Camera, label: "Médiathèque" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/guide", icon: BookOpen, label: "Guide" },
  { href: "/settings", icon: Settings, label: "Réglages" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showMore, setShowMore] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { installAuthInterceptor(); }, []);

  const toggleMore = useCallback(() => setShowMore((v) => !v), []);
  const closeMore = useCallback(() => setShowMore(false), []);

  // Fermer le menu Plus quand on clique à l'extérieur
  useEffect(() => {
    if (!showMore) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        closeMore();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMore, closeMore]);

  // Fermer le menu Plus quand on change de route
  useEffect(() => {
    closeMore();
  }, [pathname, closeMore]);

  return (
    <>
      {/* Top bar desktop */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 bg-white dark:bg-[#0e0e0f] border-b border-slate-200 dark:border-[#2e2e30] items-center px-4 gap-1">
        <div className="flex items-center mr-6">
          <Image src="/logo-cpm-mars.png" alt="CPM Mars" width={100} height={32} className="h-8 w-auto dark:hidden" style={{ width: "auto", height: "auto" }} priority />
          <Image src="/logo-cpm-mars-white.png" alt="CPM Mars" width={100} height={32} className="h-8 w-auto hidden dark:block" style={{ width: "auto", height: "auto" }} priority />
        </div>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-teal-cpm/10 dark:bg-teal-cpm/15 text-teal-cpm"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1a1a1b] hover:text-slate-900 dark:hover:text-zinc-100"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
        {MORE_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-teal-cpm/10 dark:bg-teal-cpm/15 text-teal-cpm"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1a1a1b] hover:text-slate-900 dark:hover:text-zinc-100"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
        <div className="ml-auto">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1a1a1b] transition-colors"
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Bottom nav mobile — 4 items + menu Plus */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-[#0e0e0f] border-t border-slate-200 dark:border-[#2e2e30] flex px-2 pb-safe-extra">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors rounded-xl",
                active ? "text-teal-cpm" : "text-slate-500 dark:text-slate-400"
              )}
            >
              <item.icon className={cn("w-5 h-5", active && "stroke-[color:var(--color-teal-cpm)]")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        {/* Menu Plus */}
        <div className="flex-1 relative" ref={moreMenuRef}>
          <button
            onClick={toggleMore}
            className={cn(
              "w-full flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors rounded-xl",
              showMore ? "text-teal-cpm" : "text-slate-500 dark:text-slate-400"
            )}
            aria-label="Menu supplémentaire"
            aria-expanded={showMore}
          >
            <MoreHorizontal className={cn("w-5 h-5", showMore && "stroke-[color:var(--color-teal-cpm)]")} />
            <span className="truncate">Plus</span>
          </button>
          {/* Overlay pour capturer les clics à l'extérieur */}
          {showMore && (
            <div 
              className="fixed inset-0 z-[9999] bg-transparent"
              onClick={closeMore}
            />
          )}
          {showMore && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-[#1a1a1b] rounded-xl shadow-lg border border-slate-200 dark:border-[#2e2e30] p-2 min-w-[160px] z-[10000]">
              {MORE_ITEMS.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMore}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active ? "text-teal-cpm bg-teal-cpm/10 dark:bg-teal-cpm/15" : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#222223]"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
