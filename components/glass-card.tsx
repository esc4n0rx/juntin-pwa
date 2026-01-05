"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { useState, useEffect } from "react"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "blue" | "green" | "pink"
}

export function GlassCard({ children, className, variant = "default" }: GlassCardProps) {
  const theme = useAppStore((state) => state.theme)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const variants = {
    light: {
      default: "bg-white/70 backdrop-blur-xl border-white/20",
      blue: "bg-blue-400/20 backdrop-blur-xl border-blue-200/30",
      green: "bg-emerald-400/20 backdrop-blur-xl border-emerald-200/30",
      pink: "bg-pink-400/20 backdrop-blur-xl border-pink-200/30",
    },
    bw: {
      default: "bg-white/70 backdrop-blur-xl border-gray-200/30",
      blue: "bg-gray-100/70 backdrop-blur-xl border-gray-300/30",
      green: "bg-gray-100/70 backdrop-blur-xl border-gray-300/30",
      pink: "bg-gray-100/70 backdrop-blur-xl border-gray-300/30",
    },
  }

  const currentTheme = isHydrated ? theme : "light"

  return (
    <div className={cn("rounded-3xl border shadow-lg transition-all", variants[currentTheme][variant], className)}>
      {children}
    </div>
  )
}
