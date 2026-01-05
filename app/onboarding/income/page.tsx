"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { createInvite } from "@/lib/api/invites"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export default function IncomePage() {
  const router = useRouter()
  const mode = useAppStore((state) => state.mode)
  const setIncome = useAppStore((state) => state.setIncome)
  const setPartnerEmail = useAppStore((state) => state.setPartnerEmail)
  const [income, setIncomeValue] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [partnerEmail, setPartnerEmailValue] = useState("")

  const handleFinish = async () => {
    if (!income) {
      toast.error("Digite o valor da sua renda")
      return
    }

    if (mode === "couple" && !partnerEmail) {
      toast.error("Digite o email do seu parceiro(a)")
      return
    }

    // Optimistic UI updates
    setIncome(Number.parseFloat(income), frequency)
    if (partnerEmail) setPartnerEmail(partnerEmail)

    // Get categories from store
    const categories = useAppStore.getState().categories

    try {
      const res = await fetch('/api/onboarding/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          income: Number.parseFloat(income),
          frequency,
          partnerEmail: mode === 'couple' ? partnerEmail : null,
          categories: categories // Send categories state
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erro ao finalizar setup")
      }

      if (mode === "couple" && partnerEmail) {
        toast.success("Convite enviado!")
      }

      router.push("/app")

    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao finalizar setup")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1/3 bg-blue-400 rounded-full" />
              <div className="h-1 w-1/3 bg-blue-400 rounded-full" />
              <div className="h-1 w-1/3 bg-blue-400 rounded-full" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Renda</h1>
            <p className="text-slate-600">
              {mode === "couple" ? "Informe a renda conjunta do casal" : "Quanto você recebe mensalmente?"}
            </p>
          </div>

          <div className="space-y-6">
            {mode === "couple" && (
              <GlassCard className="p-6">
                <h3 className="font-bold text-slate-800 mb-4">Convide seu parceiro(a)</h3>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmailValue(e.target.value)}
                  className="h-12 rounded-xl"
                />
                <p className="text-xs text-slate-500 mt-2">Seu parceiro(a) receberá um convite por email</p>
              </GlassCard>
            )}

            <GlassCard className="p-6">
              <Label className="text-base font-semibold text-slate-800 mb-3 block">Valor da Renda</Label>
              <Input
                type="number"
                placeholder="R$ 0,00"
                value={income}
                onChange={(e) => setIncomeValue(e.target.value)}
                className="h-14 rounded-xl text-lg mb-6"
              />

              <Label className="text-base font-semibold text-slate-800 mb-3 block">Frequência</Label>
              <RadioGroup value={frequency} onValueChange={setFrequency}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="cursor-pointer">
                      Mensal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="biweekly" id="biweekly" />
                    <Label htmlFor="biweekly" className="cursor-pointer">
                      Quinzenal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly" className="cursor-pointer">
                      Semanal
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </GlassCard>
          </div>

          <Button
            onClick={handleFinish}
            className="w-full h-14 text-base font-semibold rounded-2xl bg-slate-800 hover:bg-slate-700 mt-8"
          >
            Finalizar Configuração
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
