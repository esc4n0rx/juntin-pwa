"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export default function SelectModePage() {
  const router = useRouter()
  const setMode = useAppStore((state) => state.setMode)
  const [selected, setSelected] = useState<"solo" | "couple" | null>(null)

  const handleContinue = async () => {
    if (selected) {
      setMode(selected)

      // Update Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ mode: selected })
          .eq('id', user.id)
      }

      router.push("/onboarding/categories")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Como você quer gerenciar suas finanças?</h1>
          <p className="text-slate-600">Escolha o modo que melhor se adequa a você</p>
        </div>

        <div className="space-y-4 mb-8">
          <motion.div whileTap={{ scale: 0.98 }} onClick={() => setSelected("solo")}>
            <GlassCard
              className={`p-6 cursor-pointer transition-all ${selected === "solo" ? "ring-4 ring-blue-400 scale-[1.02]" : ""
                }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-400/20 flex items-center justify-center text-3xl">👤</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Sozinho</h3>
                  <p className="text-sm text-slate-600">Gerencie suas finanças pessoais</p>
                </div>
                {selected === "solo" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div whileTap={{ scale: 0.98 }} onClick={() => setSelected("couple")}>
            <GlassCard
              className={`p-6 cursor-pointer transition-all ${selected === "couple" ? "ring-4 ring-pink-400 scale-[1.02]" : ""
                }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-pink-400/20 flex items-center justify-center text-3xl">💑</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Em Casal</h3>
                  <p className="text-sm text-slate-600">Compartilhe finanças com seu parceiro(a)</p>
                </div>
                {selected === "couple" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-pink-400 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selected}
          className="w-full h-14 text-base font-semibold rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
        >
          Continuar
        </Button>
      </motion.div>
    </div>
  )
}
