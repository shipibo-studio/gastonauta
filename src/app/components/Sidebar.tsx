"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  ScrollText,
  Settings,
  LogOut,
  Orbit,
} from "lucide-react";
import { Icon } from "../components/Icon";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Mis gastos", icon: List, path: "/dashboard/gastos" },
  { label: "Logs", icon: ScrollText, path: "/dashboard/logs" },
  { label: "Configuración", icon: Settings, path: "/dashboard/settings" },
  { label: "Cerrar sesión", icon: LogOut, path: null },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Forzar collapsed en mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <aside
      className={`relative z-10 flex flex-col h-screen transition-all duration-300 bg-white/10 dark:bg-stone-900/40 backdrop-blur-xl border-r border-stone-300/20 dark:border-stone-700/40 shadow-xl p-4 ${collapsed ? "w-16 min-w-[4rem]" : "w-64 min-w-[200px] max-w-xs"}`}
    >
      <div className="flex items-center gap-2 mb-8 justify-between">
        {collapsed ? (
          <span className="flex items-center justify-center w-6 h-6 text-cyan-400">
            <Icon as={Orbit} className="w-6 h-6" />
          </span>
        ) : (
          <span className="flex items-center gap-2 text-2xl font-serif text-stone-100 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)] transition-all scale-100 opacity-100 w-auto">
            <Icon as={Orbit} className="w-6 h-6 text-cyan-400" />
            Gastonauta
          </span>
        )}
        <button
          className="ml-auto text-stone-400 hover:text-cyan-400 transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 hover:cursor-pointer"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Colapsar sidebar"
          type="button"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className={`transition-transform ${collapsed ? "rotate-180" : ""}`}>
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <nav className="flex flex-col gap-2 text-stone-200 h-full">
        {/* Items superiores */}
        {sidebarItems.slice(0, 3).map((item) => {
          const LucideIcon = item.icon;
          const isActive = pathname === item.path;
          return (
            <div key={item.label} className="relative group">
              <button
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-sans text-base w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 hover:cursor-pointer ${collapsed ? "justify-center px-0" : ""} ${isActive ? "bg-cyan-400/10 text-cyan-400" : "hover:bg-cyan-400/10 hover:text-cyan-400"}`}
                tabIndex={0}
                type="button"
                onClick={() => item.path && router.push(item.path)}
              >
                <Icon as={LucideIcon} className="w-5 h-5 shrink-0" />
                <span className={`${collapsed ? "sr-only" : ""}`}>{item.label}</span>
              </button>
              {collapsed && (
                <span
                  className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-stone-900/90 px-3 py-1 text-sm font-sans text-stone-100 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-stone-700 backdrop-blur-xl"
                  role="tooltip"
                >
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
        <div className="flex-grow" />
        {/* Items inferiores alineados abajo */}
        {sidebarItems.slice(3).map((item) => {
          const LucideIcon = item.icon;
          const isActive = pathname === item.path;
          if (item.label === "Cerrar sesión") {
            return (
              <div key={item.label} className="relative group">
                <button
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-sans text-base w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 hover:cursor-pointer ${collapsed ? "justify-center px-0" : ""} hover:bg-pink-400/10 hover:text-pink-400`}
                  tabIndex={0}
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/");
                  }}
                >
                  <Icon as={LucideIcon} className="w-5 h-5 shrink-0" />
                  <span className={`${collapsed ? "sr-only" : ""}`}>{item.label}</span>
                </button>
                {collapsed && (
                  <span
                    className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-stone-900/90 px-3 py-1 text-sm font-sans text-stone-100 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-stone-700 backdrop-blur-xl"
                    role="tooltip"
                  >
                    {item.label}
                  </span>
                )}
              </div>
            );
          }
          return (
            <div key={item.label} className="relative group">
              <button
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-sans text-base w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 hover:cursor-pointer ${collapsed ? "justify-center px-0" : ""} ${isActive ? "bg-cyan-400/10 text-cyan-400" : "hover:bg-cyan-400/10 hover:text-cyan-400"}`}
                tabIndex={0}
                type="button"
              >
                <Icon as={LucideIcon} className="w-5 h-5 shrink-0" />
                <span className={`${collapsed ? "sr-only" : ""}`}>{item.label}</span>
              </button>
              {collapsed && (
                <span
                  className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-stone-900/90 px-3 py-1 text-sm font-sans text-stone-100 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-stone-700 backdrop-blur-xl"
                  role="tooltip"
                >
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
