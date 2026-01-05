"use client"

import type React from "react"
import { useAppStore } from "@/lib/store"
import { useEffect, useState } from "react"

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    document.documentElement.classList.toggle("bw-theme", theme === "bw")
  }, [theme, isHydrated])

  return <>{children}</>
}
