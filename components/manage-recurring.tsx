"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"

type Recurring = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  frequency: string
  category?: { name: string; icon: string }
  account?: { name: string; icon: string }
}

export function ManageRecurring() {
  const theme = useAppStore((state) => state.theme)
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecurring()
  }, [])

  const fetchRecurring = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/recurring')
      const data = await res.json()
      if (res.ok && data.recurring) setRecurring(data.recurring)
    } catch (error) {
      toast.error('Erro ao carregar contas recorrentes')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja desativar esta conta recorrente?')) return

    try {
      const res = await fetch('/api/recurring', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (!res.ok) throw new Error((await res.json()).error)

      toast.success('Conta recorrente desativada!')
      fetchRecurring()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const frequencyLabels: Record<string, string> = {
    daily: 'Diária',
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal',
    yearly: 'Anual'
  }

  return (
    <div>
      <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
        Contas Recorrentes
      </h3>

      {loading ? (
        <p className="text-center text-slate-500 py-4">Carregando...</p>
      ) : recurring.length === 0 ? (
        <GlassCard className="p-6 text-center">
          <p className="text-slate-500 text-sm">Nenhuma conta recorrente cadastrada</p>
          <p className="text-xs text-slate-400 mt-1">Crie recorrências ao adicionar despesas/receitas</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {recurring.map((r) => (
            <GlassCard key={r.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{r.category?.icon || '💰'}</span>
                  <div className="flex-1">
                    <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                      {r.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.account?.name} • {frequencyLabels[r.frequency] || r.frequency}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    r.type === 'income' ? "text-emerald-600" : "text-pink-600"
                  }`}>
                    {r.type === 'income' ? '+' : '-'} R$ {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-red-600 hover:underline mt-1"
                  >
                    Desativar
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
