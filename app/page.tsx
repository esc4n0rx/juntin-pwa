"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { motion } from "framer-motion"
import Lottie from "lottie-react"
import financeAnimation from "@/public/finance.json"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export default function SplashPage() {
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)
  const setUser = useAppStore((state) => state.setUser)
  const setAuthenticated = useAppStore((state) => state.setAuthenticated)
  const setMode = useAppStore((state) => state.setMode)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const init = async () => {
      // Minimum splash time of 2s
      const startTime = Date.now()

      // Check Supabase Session
      const { data: { user } } = await supabase.auth.getUser()

      let nextRoute = "/login"

      if (user) {
        // Sync store
        setAuthenticated(true)
        setUser({
          name: user.name || "User",
          email: user.email,
          avatar: user.avatar
        })

        // Sync Income from Couple Data
        if (user.income !== undefined) {
          useAppStore.getState().setIncome(user.income, user.incomeFrequency || 'monthly')
        }

        // Sync Partner Data
        if (user.partner) {
          useAppStore.getState().setPartnerEmail(user.partner.email)
          if (user.partner.avatar) {
            useAppStore.getState().setPartnerAvatar(user.partner.avatar)
          }
        }

        // Fetch profile to check setup/mode
        const { data: profile } = await supabase
          .from('profiles')
          .select('setup, mode, couple_id')
          .eq('id', user.id)
          .single()

        // Sync Categories (if profile exists and is setup)
        if (profile?.setup) {
          // We need to fetch via API to get shared categories.
          // Since we are client-side in splash, we can use fetch/API route or supabase client.
          // Using API route ensures consistency with backend logic (couple_id handling).
          try {
            // Determine couple_id from profile (or it's in user.couple_id from 'me' but we are in supabase flow here)
            // Actually, 'init' here uses Supabase client directly, which might not be fully synced with 'me' API logic if we mixing.
            // Better to use the SAME 'me' API or fetch categories via API.
            // Let's use the API route for categories to be safe.
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

        if (profile) {
          if (profile.mode) {
            setMode(profile.mode) // Sync mode
          }

          if (!profile.setup) {
            nextRoute = "/select-mode"
          } else if (profile.mode) {
            if (profile.mode === 'couple') {
              const { data: partner } = await supabase
                .from('profiles')
                .select('setup')
                .eq('couple_id', profile.couple_id)
                .neq('id', user.id)
                .single()

              if (partner && !partner.setup) {
                nextRoute = "/waiting-partner"
              } else {
                nextRoute = "/app"
              }
            } else {
              nextRoute = "/app"
            }
          }
        } else {
          nextRoute = "/select-mode" // Fallback if profile missing but user auth'd
        }
      } else {
        useAppStore.getState().reset() // Clear store if no session
      }

      // Calculate remaining time to satisfy 2s minimum
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(2000 - elapsedTime, 0)

      setTimeout(() => {
        router.push(nextRoute)
      }, remainingTime)
    }

    init()
  }, [router, isHydrated, setUser, setAuthenticated, setMode])

  if (!isHydrated) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center w-full max-w-sm"
      >
        <h1
          className="text-5xl font-black text-slate-800 mb-8"
          style={{ fontFamily: "--font-inter, sans-serif" }} // Using variable from layout
        >
          JUNTIN
        </h1>

        <div className="w-64 h-64 mx-auto">
          <Lottie animationData={financeAnimation} loop={true} />
        </div>
      </motion.div>
    </div>
  )
}
