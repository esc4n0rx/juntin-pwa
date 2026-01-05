"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function BudgetPage() {
  const router = useRouter()
  const categories = useAppStore((state) => state.categories)
  const updateCategory = useAppStore((state) => state.updateCategory)
  const [budgets, setBudgets] = useState<Record<string, string>>({})

  const handleBudgetChange = (categoryId: string, value: string) => {
    setBudgets({ ...budgets, [categoryId]: value })
  }

  const handleContinue = () => {
    Object.entries(budgets).forEach(([id, value]) => {
      if (value) {
        updateCategory(id, { budget: Number.parseFloat(value) })
      }
    })
    router.push("/onboarding/income")
  }

  const handleSkip = () => {
    router.push("/onboarding/income")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1/3 bg-blue-400 rounded-full" />
              <div className="h-1 w-1/3 bg-blue-400 rounded-full" />
              <div className="h-1 w-1/3 bg-slate-300 rounded-full" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Orçamentos</h1>
            <p className="text-slate-600">Defina limites de gastos por categoria (opcional)</p>
          </div>

          <div className="space-y-4 mb-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-200/50 flex items-center justify-center text-2xl">
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 mb-2">{category.name}</h3>
                      <Input
                        type="number"
                        placeholder="R$ 0,00"
                        value={budgets[category.id] || ""}
                        onChange={(e) => handleBudgetChange(category.id, e.target.value)}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="flex gap-4">
            <Button onClick={handleSkip} variant="outline" className="h-14 px-8 rounded-2xl bg-transparent">
              Pular
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1 h-14 text-base font-semibold rounded-2xl bg-slate-800 hover:bg-slate-700"
            >
              Continuar
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
