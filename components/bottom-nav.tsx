"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/app", icon: "home", label: "Home" },
  { href: "/app/analysis", icon: "chart", label: "Análise" },
  { href: "/app/expenses", icon: "wallet", label: "Despesas" },
  { href: "/app/goals", icon: "target", label: "Objetivos" },
  { href: "/app/future", icon: "calendar", label: "Futuro" },
  { href: "/app/profile", icon: "user", label: "Perfil" },
]

const ICONS = {
  home: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  chart: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  wallet: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  ),
  target: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    </svg>
  ),
  calendar: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  user: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
}

export function BottomNav() {
  const pathname = usePathname()
  const theme = useAppStore((state) => state.theme)

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 pb-safe",
        theme === "dark"
          ? "bg-slate-900/50 border-t border-slate-700/50"
          : theme === "bw"
          ? "bg-white/80 border-t border-slate-200/50"
          : "bg-white/70 border-t border-slate-200/50",
        "backdrop-blur-xl",
      )}
    >
      <div className="flex items-center justify-around px-2 h-20">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex-1 flex flex-col items-center justify-center"
            >
              <motion.div
                className={cn(
                  "flex flex-col items-center gap-1",
                  isActive
                    ? theme === "dark"
                      ? "text-white"
                      : theme === "bw"
                      ? "text-slate-800"
                      : "text-blue-500"
                    : theme === "dark"
                    ? "text-slate-400"
                    : "text-slate-400",
                )}
                whileTap={{ scale: 0.9 }}
              >
                {ICONS[item.icon as keyof typeof ICONS]}
                <span className="text-xs font-medium">{item.label}</span>
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className={cn(
                    "absolute -top-1 w-12 h-1 rounded-full",
                    theme === "dark"
                      ? "bg-white"
                      : theme === "bw"
                      ? "bg-slate-800"
                      : "bg-blue-500",
                  )}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
