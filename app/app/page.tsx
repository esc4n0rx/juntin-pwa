"use client"

import { useAppStore } from "@/lib/store"
import { GlassCard } from "@/components/glass-card"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"

type Category = {
  id: string
  name: string
  icon: string
  color?: string
}

type Transaction = {
  id: string
  type: "income" | "expense"
  amount: number
  date: string
  description?: string
  category?: {
    id: string
    name: string
    icon: string
  }
  user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

export default function HomePage() {
  const user = useAppStore((state) => state.user)
  const mode = useAppStore((state) => state.mode)
  const theme = useAppStore((state) => state.theme)
  const setMode = useAppStore((state) => state.setMode)
  const setUser = useAppStore((state) => state.setUser)
  const setPartnerEmail = useAppStore((state) => state.setPartnerEmail)
  const setPartnerAvatar = useAppStore((state) => state.setPartnerAvatar)

  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // 1. Sincronizar dados do usuário
        const meRes = await fetch('/api/auth/me')
        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData.user) {
            if (meData.user.mode) {
              setMode(meData.user.mode)
            }
            if (meData.user.name && meData.user.email) {
              setUser({
                name: meData.user.name,
                email: meData.user.email,
                avatar: meData.user.avatar
              })
            }
            if (meData.user.partner) {
              setPartnerEmail(meData.user.partner.email)
              if (meData.user.partner.avatar) {
                setPartnerAvatar(meData.user.partner.avatar)
              }
            }
          }
        }

        // 2. Buscar categorias
        const catRes = await fetch('/api/categories')
        if (catRes.ok) {
          const catData = await catRes.json()
          if (catData.categories) {
            setCategories(catData.categories)
          }
        }

        // 3. Buscar TODAS as transações (sem filtro de data para calcular saldo geral)
        const transRes = await fetch('/api/transactions')
        if (transRes.ok) {
          const transData = await transRes.json()
          if (transData.transactions) {
            setTransactions(transData.transactions)
          }
        }

      } catch (error) {
        console.error("Erro ao carregar dados da home:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calcular estatísticas
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const balance = totalIncome - totalExpenses

  const recentTransactions = transactions.slice(0, 5)

  return (
    <div className="p-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h2 className="text-slate-600 text-sm mb-1">Olá,</h2>
          <h1 className="text-3xl font-bold text-slate-800">
            {user?.name || "Usuário"}
            {mode === "couple" && " 💑"}
          </h1>
        </div>

        <GlassCard variant="blue" className="p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-700 text-sm font-medium">Saldo Geral</span>
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          {loading ? (
            <h2 className="text-2xl font-bold text-slate-600">Carregando...</h2>
          ) : (
            <>
              <h2 className={`text-4xl font-black mb-1 ${theme === "bw" ? "text-slate-900" : "text-slate-800"}`}>
                R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-xs text-slate-600">{balance >= 0 ? "Você está no azul!" : "Atenção aos gastos"}</p>
            </>
          )}
        </GlassCard>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <GlassCard variant="green" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${theme === "bw" ? "bg-slate-200" : "bg-emerald-400/30"
                  }`}
              >
                <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <span className="text-xs text-slate-600">Receitas</span>
            </div>
            <p className={`text-xl font-bold ${theme === "bw" ? "text-slate-900" : "text-emerald-700"}`}>
              + R$ {totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </GlassCard>

          <GlassCard variant="pink" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${theme === "bw" ? "bg-slate-200" : "bg-pink-400/30"
                  }`}
              >
                <svg className="w-5 h-5 text-pink-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
              <span className="text-xs text-slate-600">Despesas</span>
            </div>
            <p className={`text-xl font-bold ${theme === "bw" ? "text-slate-900" : "text-pink-700"}`}>
              - R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </GlassCard>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Transações Recentes</h3>
          <button className="text-sm text-blue-600 font-medium">Ver todas</button>
        </div>

        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-slate-600">Carregando transações...</p>
          </GlassCard>
        ) : recentTransactions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-slate-600 mb-2">Nenhuma transação ainda</p>
            <p className="text-sm text-slate-500">Comece adicionando suas receitas e despesas</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className={`p-4 relative ${mode === "couple" ? "pt-10" : ""}`}>
                  {mode === "couple" && transaction.user && (
                    <div
                      className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        theme === "bw"
                          ? "bg-slate-200 text-slate-800"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {transaction.user.full_name}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                          transaction.type === "income"
                            ? theme === "bw"
                              ? "bg-slate-200"
                              : "bg-emerald-100"
                            : theme === "bw"
                              ? "bg-slate-200"
                              : "bg-pink-100"
                        }`}
                      >
                        {transaction.category?.icon || "💰"}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{transaction.category?.name || "Sem categoria"}</h4>
                        <p className="text-xs text-slate-500">
                          {new Date(transaction.date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          transaction.type === "income"
                            ? theme === "bw"
                              ? "text-slate-900"
                              : "text-emerald-600"
                            : theme === "bw"
                              ? "text-slate-900"
                              : "text-pink-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"} R${" "}
                        {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      {transaction.description && <p className="text-xs text-slate-500 mt-1">{transaction.description}</p>}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
