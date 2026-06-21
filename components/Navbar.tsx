"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Mail, Settings, Package, Sun, Moon, Users, BookOpen, MoreHorizontal } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

// Navigation principale (5 items max pour mobile)
const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/planning", icon: Calendar, label: "Planning" },
  { href: "/mails", icon: Mail, label: "Mails" },
  { href: "/contacts", icon: Users, label: "Contacts" },
];

// Items dans le menu "Plus" (mobile)
const MORE_ITEMS = [
  { href: "/guide", icon: BookOpen, label: "Guide" },
  { href: "/settings", icon: Settings, label: "Réglages" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showMore, setShowMore] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu Plus quand on clique à l'extérieur
  useEffect(() => {
    if (!showMore) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMore]);

  // Fermer le menu Plus quand on change de route
  useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  return (
    <>
      {/* Top bar desktop */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 items-center px-4 gap-1">
        <div className="flex items-center gap-2 mr-6">
          <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Mars Merch</span>
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
                  ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
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
                "hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
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
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Bottom nav mobile — 4 items + menu Plus */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex px-2 pb-safe-extra">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors rounded-xl",
                active ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
              )}
            >
              <item.icon className={cn("w-5 h-5", active && "stroke-red-600 dark:stroke-red-400")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        {/* Menu Plus */}
        <div className="flex-1 relative" ref={moreMenuRef}>
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "w-full flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors rounded-xl",
              showMore ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
            )}
          >
            <MoreHorizontal className={cn("w-5 h-5", showMore && "stroke-red-600 dark:stroke-red-400")} />
            <span className="truncate">Plus</span>
          </button>
          {/* Overlay pour capturer les clics à l'extérieur */}
          {showMore && (
            <div 
              className="fixed inset-0 z-[55] bg-transparent"
              onClick={() => setShowMore(false)}
            />
          )}
          {showMore && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-2 min-w-[160px] z-[60]">
              {MORE_ITEMS.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
