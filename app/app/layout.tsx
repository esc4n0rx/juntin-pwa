"use client"

import type React from "react"

import { BottomNav } from "@/components/bottom-nav"
import { useAppStore } from "@/lib/store"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme)

  return (
    <div className={`min-h-screen pb-24 transition-colors ${
      theme === "dark"
        ? "bg-gradient-to-b from-slate-950 to-slate-900"
        : "bg-gradient-to-b from-slate-50 to-blue-50"
    }`}>
      {children}
      <BottomNav />
    </div>
  )
}
