"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

type Transaction = {
  id: string
  type: "income" | "expense" | "transfer"
  amount: number
  date: string
  category?: {
    id: string
    name: string
    icon: string
    color?: string
  }
}

type CategoryAnalysis = {
  name: string
  icon: string
  amount: number
  percentage: number
  count: number
  color: string
}

type Period = "today" | "week" | "month" | "year"

export default function AnalysisPage() {
  const theme = useAppStore((state) => state.theme)
  const mode = useAppStore((state) => state.mode)
  const setMode = useAppStore((state) => state.setMode)
  const aiInsights = useAppStore((state) => state.aiInsights)
  const setAIInsights = useAppStore((state) => state.setAIInsights)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month")
  const [generatingInsights, setGeneratingInsights] = useState(false)

  // Sincronizar modo
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

  // Buscar transações
  useEffect(() => {
    fetchTransactions()
  }, [selectedPeriod])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transactions')
      const data = await response.json()

      if (response.ok && data.transactions) {
        setTransactions(
          filterByPeriod(data.transactions, selectedPeriod).filter(
            (transaction) => transaction.type !== "transfer"
          )
        )
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterByPeriod = (allTransactions: Transaction[], period: Period): Transaction[] => {
    const now = new Date()
    const today = new Date(now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))

    return allTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date)

      switch (period) {
        case 'today':
          return transactionDate.toDateString() === today.toDateString()

        case 'week':
          const weekAgo = new Date(today)
          weekAgo.setDate(today.getDate() - 7)
          return transactionDate >= weekAgo && transactionDate <= today

        case 'month':
          return transactionDate.getMonth() === today.getMonth() &&
                 transactionDate.getFullYear() === today.getFullYear()

        case 'year':
          return transactionDate.getFullYear() === today.getFullYear()

        default:
          return true
      }
    })
  }

  // Análise de dados
  const expenses = transactions.filter(t => t.type === "expense")
  const incomes = transactions.filter(t => t.type === "income")

  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0)
  const balance = totalIncome - totalExpenses

  // Análise por categoria
  const categoryAnalysis: CategoryAnalysis[] = (() => {
    const categoryMap: Record<string, { amount: number; count: number; icon: string; color: string }> = {}

    expenses.forEach(transaction => {
      if (!transaction.category) return

      const name = transaction.category.name
      if (!categoryMap[name]) {
        categoryMap[name] = {
          amount: 0,
          count: 0,
          icon: transaction.category.icon || "💰",
          color: transaction.category.color || "#60a5fa"
        }
      }
      categoryMap[name].amount += transaction.amount
      categoryMap[name].count += 1
    })

    return Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        icon: data.icon,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        count: data.count,
        color: data.color
      }))
      .sort((a, b) => b.amount - a.amount)
  })()

  const topCategory = categoryAnalysis[0]

  // Cores do gráfico
  const getColor = (index: number) => {
    if (theme === "bw") {
      const shades = ["#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db"]
      return shades[index % shades.length]
    }
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]
    return colors[index % colors.length]
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Hoje'
      case 'week': return 'Últimos 7 dias'
      case 'month': return 'Este mês'
      case 'year': return 'Este ano'
    }
  }

  const generateAIInsights = async () => {
    try {
      setGeneratingInsights(true)

      const financialData = {
        totalExpenses,
        totalIncome,
        balance,
        period: getPeriodLabel(),
        transactions: {
          expenses: expenses.length,
          incomes: incomes.length,
          total: transactions.length
        },
        topCategories: categoryAnalysis.slice(0, 5),
        mode: mode || 'solo'
      }

      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(financialData)
      })

      const data = await response.json()

      if (response.ok && data.insights) {
        setAIInsights(data.insights)
      } else {
        console.error('Erro ao gerar insights:', data.error)
      }
    } catch (error) {
      console.error('Erro ao gerar insights:', error)
    } finally {
      setGeneratingInsights(false)
    }
  }

  return (
    <div className="p-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className={`text-3xl font-bold mb-6 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Análise</h1>

        {/* Filtros de Período */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['today', 'week', 'month', 'year'] as Period[]).map((period) => (
              <Button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                variant={selectedPeriod === period ? "default" : "outline"}
                className={`rounded-xl whitespace-nowrap ${
                  selectedPeriod === period
                    ? theme === "dark"
                      ? "bg-blue-600 text-white"
                      : theme === "bw"
                      ? "bg-slate-800 text-white"
                      : "bg-blue-500 text-white"
                    : theme === "dark"
                    ? "bg-transparent border-slate-600 text-slate-300"
                    : "bg-transparent"
                }`}
              >
                {period === 'today' && '📅 Hoje'}
                {period === 'week' && '📊 Semana'}
                {period === 'month' && '📆 Mês'}
                {period === 'year' && '🗓️ Ano'}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>Carregando análise...</p>
          </GlassCard>
        ) : transactions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className={`mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Sem dados para {getPeriodLabel().toLowerCase()}</p>
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Adicione despesas para ver suas análises</p>
          </GlassCard>
        ) : (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <GlassCard variant="green" className="p-4">
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Receitas</div>
                <div className={`text-lg font-bold ${
                  theme === "dark" ? "text-emerald-400" : theme === "bw" ? "text-slate-900" : "text-emerald-700"
                }`}>
                  R$ {totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </GlassCard>

              <GlassCard variant="pink" className="p-4">
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Despesas</div>
                <div className={`text-lg font-bold ${
                  theme === "dark" ? "text-pink-400" : theme === "bw" ? "text-slate-900" : "text-pink-700"
                }`}>
                  R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </GlassCard>

              <GlassCard variant="blue" className="p-4">
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Saldo</div>
                <div className={`text-lg font-bold ${
                  balance >= 0
                    ? theme === "dark"
                      ? "text-blue-400"
                      : theme === "bw"
                      ? "text-slate-900"
                      : "text-blue-700"
                    : "text-red-500"
                }`}>
                  R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </GlassCard>
            </div>

            {/* Card Principal com Insights */}
            {topCategory && (
              <GlassCard variant="blue" className="p-6 mb-6">
                <h3 className={`text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Maior Despesa - {getPeriodLabel()}</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
                    theme === "dark" ? "bg-blue-900/50" : theme === "bw" ? "bg-slate-200" : "bg-blue-100"
                  }`}>
                    {topCategory.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{topCategory.name}</h4>
                    <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                      {topCategory.percentage.toFixed(1)}% do total • {topCategory.count} {topCategory.count === 1 ? 'lançamento' : 'lançamentos'}
                    </p>
                  </div>
                </div>
                <p className={`text-3xl font-black ${theme === "dark" ? "text-white" : theme === "bw" ? "text-slate-900" : "text-slate-800"}`}>
                  R$ {topCategory.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </GlassCard>
            )}

            {/* Gráfico de Pizza (visual simples com barras) */}
            <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Distribuição por Categoria</h3>

            <div className="space-y-3 mb-6">
              {categoryAnalysis.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-2xl">{category.icon}</div>
                        <div className="flex-1">
                          <h4 className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{category.name}</h4>
                          <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                            {category.count} {category.count === 1 ? 'lançamento' : 'lançamentos'} • {category.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${theme === "dark" ? "text-white" : theme === "bw" ? "text-slate-900" : "text-slate-800"}`}>
                          R$ {category.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="relative h-3 bg-slate-200/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${category.percentage}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className="absolute h-full rounded-full"
                        style={{
                          backgroundColor: getColor(index),
                        }}
                      />
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* Insights Inteligentes */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                  <span>💡</span>
                  <span>Insights</span>
                </h3>
                <Button
                  onClick={generateAIInsights}
                  disabled={generatingInsights || transactions.length === 0}
                  className={`rounded-xl text-sm ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                      : theme === "bw"
                      ? "bg-slate-800 text-white hover:bg-slate-700"
                      : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                  }`}
                >
                  {generatingInsights ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      ✨ Gerar Análise IA
                    </>
                  )}
                </Button>
              </div>

              {aiInsights && aiInsights.analises && aiInsights.analises.length > 0 ? (
                <div className="space-y-4 mb-6">
                  <h4 className={`text-sm font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>Análises da IA</h4>
                  {aiInsights.analises.map((analise, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        theme === "dark" ? "bg-gradient-to-br from-blue-900/50 to-purple-900/50" : theme === "bw" ? "bg-slate-200" : "bg-gradient-to-br from-blue-100 to-purple-100"
                      }`}>
                        <span className="text-lg">🤖</span>
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>{analise}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : null}

              <h4 className={`text-sm font-semibold mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                {aiInsights ? 'Insights Básicos' : 'Insights'}
              </h4>
              <div className="space-y-4">
                {categoryAnalysis.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      theme === "dark" ? "bg-blue-900/50" : theme === "bw" ? "bg-slate-200" : "bg-blue-100"
                    }`}>
                      <span className="text-lg">🎯</span>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                        <strong>{topCategory.name}</strong> é sua maior despesa, representando <strong>{topCategory.percentage.toFixed(0)}%</strong> do total gasto em {getPeriodLabel().toLowerCase()}.
                      </p>
                    </div>
                  </div>
                )}

                {categoryAnalysis.length >= 2 && (
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      theme === "dark" ? "bg-emerald-900/50" : theme === "bw" ? "bg-slate-200" : "bg-emerald-100"
                    }`}>
                      <span className="text-lg">📊</span>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                        As top 3 categorias ({categoryAnalysis.slice(0, 3).map(c => c.name).join(', ')}) somam <strong>
                        {categoryAnalysis.slice(0, 3).reduce((sum, c) => sum + c.percentage, 0).toFixed(0)}%</strong> dos gastos.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    theme === "dark" ? "bg-purple-900/50" : theme === "bw" ? "bg-slate-200" : "bg-purple-100"
                  }`}>
                    <span className="text-lg">{balance >= 0 ? "✅" : "⚠️"}</span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                      {balance >= 0
                        ? `Parabéns! Você está com saldo positivo de R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${getPeriodLabel().toLowerCase()}.`
                        : `Atenção! Suas despesas estão R$ ${Math.abs(balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} acima das receitas em ${getPeriodLabel().toLowerCase()}.`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    theme === "dark" ? "bg-orange-900/50" : theme === "bw" ? "bg-slate-200" : "bg-orange-100"
                  }`}>
                    <span className="text-lg">📈</span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                      Você fez <strong>{transactions.length}</strong> {transactions.length === 1 ? 'lançamento' : 'lançamentos'} em {getPeriodLabel().toLowerCase()},
                      sendo <strong>{expenses.length}</strong> {expenses.length === 1 ? 'despesa' : 'despesas'} e <strong>{incomes.length}</strong> {incomes.length === 1 ? 'receita' : 'receitas'}.
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </>
        )}
      </motion.div>
    </div>
  )
}
