"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

const GOAL_ICONS = ["🎯", "✈️", "🏠", "🚗", "💍", "🎓", "💰", "🏖️"]

type Goal = {
  id: string
  name: string
  icon: string
  target_amount: number
  current_amount: number
  completed: boolean
  completed_at?: string
  user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

export default function GoalsPage() {
  const theme = useAppStore((state) => state.theme)
  const mode = useAppStore((state) => state.mode)
  const setMode = useAppStore((state) => state.setMode)

  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("🎯")

  // Sincronizar modo do usuário
  useEffect(() => {
    const syncUserMode = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        if (response.ok && data.user?.mode) {
          setMode(data.user.mode)
        }
      } catch (error) {
        console.error('Erro ao sincronizar modo:', error)
      }
    }
    syncUserMode()
  }, [])

  // Buscar objetivos
  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/goals')
      const data = await response.json()

      if (response.ok && data.goals) {
        setGoals(data.goals)
      }
    } catch (error) {
      console.error('Erro ao carregar objetivos:', error)
      toast.error('Erro ao carregar objetivos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Digite um nome para o objetivo")
      return
    }
    if (!target || Number.parseFloat(target) <= 0) {
      toast.error("Digite um valor válido")
      return
    }

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          icon: selectedIcon,
          target_amount: Number.parseFloat(target),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar objetivo')
      }

      toast.success("Objetivo criado!")

      // Reset form
      setName("")
      setTarget("")
      setSelectedIcon("🎯")
      setShowForm(false)

      // Recarregar objetivos
      fetchGoals()
    } catch (error: any) {
      console.error('Erro ao criar objetivo:', error)
      toast.error(error.message || 'Erro ao criar objetivo')
    }
  }

  const handleAddToGoal = async (goalId: string, amount: number) => {
    try {
      const response = await fetch('/api/goals/add-amount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal_id: goalId,
          amount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao adicionar valor')
      }

      if (data.completed) {
        const goal = goals.find((g) => g.id === goalId)
        toast.success(`Parabéns! Você completou "${goal?.name}"! 🎉`)
      } else {
        toast.success("Progresso atualizado!")
      }

      // Recarregar objetivos
      fetchGoals()
    } catch (error: any) {
      console.error('Erro ao adicionar valor:', error)
      toast.error(error.message || 'Erro ao adicionar valor')
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: goalId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao deletar objetivo')
      }

      toast.success("Objetivo removido")
      fetchGoals()
    } catch (error: any) {
      console.error('Erro ao deletar objetivo:', error)
      toast.error(error.message || 'Erro ao deletar objetivo')
    }
  }

  return (
    <div className="p-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Objetivos</h1>
          <Button
            onClick={() => setShowForm(!showForm)}
            className={`rounded-2xl ${theme === "bw" ? "bg-slate-800" : "bg-blue-500"} hover:opacity-90`}
          >
            {showForm ? "Cancelar" : "+ Novo"}
          </Button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-6 mb-6">
                <h3 className="font-bold text-slate-800 mb-4">Novo Objetivo</h3>

                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Escolha um ícone</Label>
                    <div className="flex gap-2">
                      {GOAL_ICONS.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setSelectedIcon(icon)}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                            selectedIcon === icon
                              ? theme === "bw"
                                ? "bg-slate-200 scale-110"
                                : "bg-blue-100 scale-110"
                              : "bg-slate-200/50"
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="name" className="mb-2 block">
                      Nome do Objetivo
                    </Label>
                    <Input
                      id="name"
                      placeholder="Ex: Viagem dos Sonhos"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="target" className="mb-2 block">
                      Valor Alvo
                    </Label>
                    <Input
                      id="target"
                      type="number"
                      placeholder="R$ 0,00"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="h-12 rounded-xl text-lg"
                    />
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className={`w-full h-12 rounded-xl ${theme === "bw" ? "bg-slate-800" : "bg-slate-800"} hover:opacity-90`}
                  >
                    Criar Objetivo
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-slate-600">Carregando objetivos...</p>
          </GlassCard>
        ) : goals.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-slate-600 mb-2">Nenhum objetivo ainda</p>
            <p className="text-sm text-slate-500">Crie objetivos para acompanhar suas metas financeiras</p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {goals.map((goal, index) => {
              const progress = (goal.current_amount / goal.target_amount) * 100
              const isComplete = goal.completed

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard className={`p-6 relative ${isComplete ? "ring-2 ring-emerald-400" : ""} ${mode === "couple" ? "pt-10" : ""}`}>
                    {mode === "couple" && goal.user && (
                      <div
                        className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          theme === "bw"
                            ? "bg-slate-200 text-slate-800"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {goal.user.full_name}
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
                            isComplete
                              ? theme === "bw"
                                ? "bg-slate-200"
                                : "bg-emerald-100"
                              : theme === "bw"
                                ? "bg-slate-200"
                                : "bg-blue-100"
                          }`}
                        >
                          {isComplete ? "✅" : goal.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{goal.name}</h3>
                          <p className="text-sm text-slate-600">
                            R$ {goal.current_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R${" "}
                            {goal.target_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Progresso</span>
                        <span className={`text-sm font-bold ${isComplete ? "text-emerald-600" : "text-slate-800"}`}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="relative h-3 bg-slate-200/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ duration: 0.8 }}
                          className={`absolute h-full rounded-full ${
                            isComplete
                              ? theme === "bw"
                                ? "bg-slate-800"
                                : "bg-emerald-500"
                              : theme === "bw"
                                ? "bg-slate-600"
                                : "bg-blue-500"
                          }`}
                        />
                      </div>
                    </div>

                    {!isComplete && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAddToGoal(goal.id, 100)}
                          variant="outline"
                          className="flex-1 h-10 rounded-xl text-sm"
                        >
                          + R$ 100
                        </Button>
                        <Button
                          onClick={() => handleAddToGoal(goal.id, 500)}
                          variant="outline"
                          className="flex-1 h-10 rounded-xl text-sm"
                        >
                          + R$ 500
                        </Button>
                        <Button
                          onClick={() => handleAddToGoal(goal.id, 1000)}
                          variant="outline"
                          className="flex-1 h-10 rounded-xl text-sm"
                        >
                          + R$ 1.000
                        </Button>
                      </div>
                    )}

                    {isComplete && (
                      <div
                        className={`text-center py-2 rounded-xl ${theme === "bw" ? "bg-slate-100" : "bg-emerald-50"}`}
                      >
                        <p className={`text-sm font-bold ${theme === "bw" ? "text-slate-800" : "text-emerald-700"}`}>
                          Objetivo Completo!
                        </p>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
