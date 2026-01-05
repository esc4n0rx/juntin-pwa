import type React from "react"

import { BottomNav } from "@/components/bottom-nav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 pb-24">
      {children}
      <BottomNav />
    </div>
  )
}
