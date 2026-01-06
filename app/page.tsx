"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"

export default function HomePage() {
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)
  const setUser = useAppStore((state) => state.setUser)
  const setAuthenticated = useAppStore((state) => state.setAuthenticated)
  const setMode = useAppStore((state) => state.setMode)
  const setPartnerEmail = useAppStore((state) => state.setPartnerEmail)
  const setPartnerAvatar = useAppStore((state) => state.setPartnerAvatar)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const init = async () => {
      try {
        // Check authentication via /api/auth/me
        const response = await fetch('/api/auth/me')
        const data = await response.json()

        if (response.ok && data.user) {
          // User is authenticated, sync store
          setAuthenticated(true)
          setUser({
            name: data.user.name || "User",
            email: data.user.email,
            avatar: data.user.avatar
          })

          if (data.user.mode) {
            setMode(data.user.mode)
          }

          // Sync Income
          if (data.user.income !== undefined) {
            useAppStore.getState().setIncome(data.user.income, data.user.incomeFrequency || 'monthly')
          }

          // Sync Partner
          if (data.user.partner) {
            setPartnerEmail(data.user.partner.email)
            if (data.user.partner.avatar) {
              setPartnerAvatar(data.user.partner.avatar)
            }
          }

          // Fetch and sync categories
          if (data.user.setup) {
            try {
              const catRes = await fetch('/api/categories');
              if (catRes.ok) {
                const catData = await catRes.json();
                if (catData.categories) {
                  useAppStore.getState().setCategories(catData.categories);
                }
              }
            } catch (e) {
              console.error("Failed to sync categories", e)
            }
          }

          // Determine redirect
          if (!data.user.setup) {
            router.push("/select-mode")
          } else {
            router.push("/app")
          }
        } else {
          // Not authenticated, reset store and go to login
          useAppStore.getState().reset()
          router.push("/login")
        }
      } catch (error) {
        console.error("Init error:", error)
        useAppStore.getState().reset()
        router.push("/login")
      }
    }

    init()
  }, [router, isHydrated, setUser, setAuthenticated, setMode, setPartnerEmail, setPartnerAvatar])

  // Render minimal loading state
  if (!isHydrated) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-black text-slate-800 mb-4">JUNTIN</h1>
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  )
}
