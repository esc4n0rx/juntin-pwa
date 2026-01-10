"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { GlassCard } from "@/components/glass-card"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { SimulatorModal, SimulationData } from "@/components/simulator-modal"

type Transaction = {
  description: string
  amount: number
  type: 'income' | 'expense'
  category?: { name: string; icon: string }
  isRecurring: boolean
  isSimulation?: boolean
}

type Projection = {
  date: string
  balance: number
  transactions: Transaction[]
  isNegative: boolean
}

type Alert = {
  date: string
  type: 'negative' | 'low'
  message: string
}

type Account = {
  id: string
  name: string
  icon: string
  current_balance: number
}

export default function FuturePage() {
  const theme = useAppStore((state) => state.theme)
  const mode = useAppStore((state) => state.mode)

  const [projections, setProjections] = useState<Projection[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const [activeSimulation, setActiveSimulation] = useState<SimulationData | null>(null)
  const [simulationInsights, setSimulationInsights] = useState<any>(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [futureInsights, setFutureInsights] = useState<any>(null)
  const [loadingFutureInsights, setLoadingFutureInsights] = useState(false)
  const [insightsCached, setInsightsCached] = useState(false)

  useEffect(() => {
    fetchProjections()
  }, [activeSimulation])

  const fetchProjections = async () => {
    try {
      setLoading(true)

      let url = '/api/future/projections'

      // Adicionar parâmetros de simulação se houver
      if (activeSimulation) {
        const params = new URLSearchParams({
          simulationType: activeSimulation.type,
          simulationDescription: activeSimulation.description,
          simulationAmount: activeSimulation.amount.toString(),
          simulationDate: activeSimulation.date,
        })

        if (activeSimulation.frequency) {
          params.append('simulationFrequency', activeSimulation.frequency)
        }

        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setProjections(data.projections || [])
        setAlerts(data.alerts || [])
        setAccounts(data.accounts || [])
        setCurrentBalance(data.currentBalance || 0)

        // Buscar insights automáticos apenas se não houver simulação ativa
        if (!activeSimulation) {
          await fetchFutureInsights(data.projections, data.currentBalance, data.alerts)
        }
      } else {
        toast.error(data.error || 'Erro ao carregar projeções')
      }
    } catch (error) {
      console.error('Erro ao carregar projeções:', error)
      toast.error('Erro ao carregar projeções')
    } finally {
      setLoading(false)
    }
  }

  const fetchFutureInsights = async (projectionsData: Projection[], balance: number, alertsData: Alert[], forceRefresh = false) => {
    try {
      setLoadingFutureInsights(true)

      // Preparar dados para enviar à IA
      const balances = projectionsData.map(p => p.balance)
      const recurringCount = projectionsData.reduce((count, p) => {
        const recurringTxs = p.transactions.filter(t => t.isRecurring)
        return count + recurringTxs.length
      }, 0)

      const willGoNegative = projectionsData.some(p => p.balance < 0)
      const firstNegativeDay = projectionsData.find(p => p.balance < 0)
      const daysUntilNegative = firstNegativeDay
        ? Math.floor((new Date(firstNegativeDay.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : undefined

      const url = forceRefresh ? '/api/ai/future-insights?refresh=true' : '/api/ai/future-insights'

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentBalance: balance,
          projectedBalances: {
            min: Math.min(...balances),
            max: Math.max(...balances),
            final: balances[balances.length - 1] || balance
          },
          alerts: alertsData,
          recurringCount: Math.floor(recurringCount / 30), // Média mensal
          daysUntilNegative,
          willGoNegative
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setFutureInsights(data.insights)
        setInsightsCached(data.cached || false)
        if (forceRefresh) {
          toast.success('Análise atualizada!')
        }
      } else {
        console.error('Erro ao buscar insights de futuro:', data.error)
      }
    } catch (error) {
      console.error('Erro ao buscar insights de futuro:', error)
    } finally {
      setLoadingFutureInsights(false)
    }
  }

  const handleRefreshInsights = async () => {
    await fetchFutureInsights(projections, currentBalance, alerts, true)
  }

  const handleSimulate = async (simulation: SimulationData) => {
    setActiveSimulation(simulation)
    setIsSimulatorOpen(false)
    toast.success('Simulação aplicada! Veja o impacto abaixo.')

    // Buscar insights de IA para a simulação
    await fetchSimulationInsights(simulation)
  }

  const fetchSimulationInsights = async (simulation: SimulationData) => {
    try {
      setLoadingInsights(true)

      // Calcular projeção após a simulação para enviar à IA
      const projectedBalanceAfter = projections.reduce((min, p) => {
        return p.balance < min ? p.balance : min
      }, currentBalance)

      const willGoNegative = projections.some(p => p.balance < 0)
      const firstNegativeDay = projections.find(p => p.balance < 0)
      const daysUntilNegative = firstNegativeDay
        ? Math.floor((new Date(firstNegativeDay.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : undefined

      const response = await fetch('/api/ai/simulation-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: simulation.type,
          description: simulation.description,
          amount: simulation.amount,
          date: simulation.date,
          frequency: simulation.frequency,
          currentBalance,
          projectedBalanceAfter,
          willGoNegative,
          daysUntilNegative,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSimulationInsights(data.insights)
      } else {
        console.error('Erro ao buscar insights:', data.error)
      }
    } catch (error) {
      console.error('Erro ao buscar insights de IA:', error)
    } finally {
      setLoadingInsights(false)
    }
  }

  const handleClearSimulation = () => {
    setActiveSimulation(null)
    setSimulationInsights(null)
    toast.info('Simulação removida')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.getTime() === today.getTime()) {
      return { text: 'Hoje', subtext: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }
    } else if (date.getTime() === tomorrow.getTime()) {
      return { text: 'Amanhã', subtext: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }
    } else {
      return {
        text: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        subtext: date.toLocaleDateString('pt-BR', { weekday: 'short' })
      }
    }
  }

  const getBalanceColor = (balance: number) => {
    if (balance < 0) return theme === "bw" ? "text-slate-900" : "text-red-600"
    if (balance < 100) return theme === "bw" ? "text-slate-700" : "text-orange-600"
    return theme === "bw" ? "text-slate-900" : "text-emerald-600"
  }

  const getAlertColor = (type: string) => {
    if (type === 'negative') return theme === "bw" ? "bg-slate-200" : "bg-red-100"
    return theme === "bw" ? "bg-slate-100" : "bg-orange-100"
  }

  const getAlertTextColor = (type: string) => {
    if (type === 'negative') return theme === "bw" ? "text-slate-900" : "text-red-700"
    return theme === "bw" ? "text-slate-800" : "text-orange-700"
  }

  return (
    <div className="p-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className={`text-3xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
            Futuro Financeiro
          </h1>
          <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
            Projeção dos próximos 30 dias
          </p>
        </div>

        {/* Banner de Simulação Ativa */}
        {activeSimulation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlassCard className={`p-4 ${
              theme === "dark" ? "bg-purple-900/30" : theme === "bw" ? "bg-slate-100" : "bg-purple-50"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className={`text-sm font-bold ${theme === "dark" ? "text-purple-300" : "text-purple-700"}`}>
                      Simulação ativa: {activeSimulation.description}
                    </p>
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      R$ {activeSimulation.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • {
                        activeSimulation.type === 'one-time' ? 'Despesa única' : `Recorrente (${activeSimulation.frequency})`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClearSimulation}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    theme === "dark"
                      ? "bg-slate-700 hover:bg-slate-600 text-white"
                      : "bg-white hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Remover
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Insights de IA da Simulação */}
        {activeSimulation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            {loadingInsights ? (
              <GlassCard className="p-6 text-center">
                <div className="text-3xl mb-2">🤖</div>
                <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  Analisando impacto com IA...
                </p>
              </GlassCard>
            ) : simulationInsights ? (
              <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🤖</span>
                  <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                    Análise Inteligente
                  </h3>
                </div>

                {/* Viabilidade */}
                <div className={`p-3 rounded-xl mb-4 ${
                  simulationInsights.viabilidade === 'sim'
                    ? theme === "dark" ? "bg-green-900/30" : theme === "bw" ? "bg-slate-100" : "bg-green-50"
                    : simulationInsights.viabilidade === 'nao'
                    ? theme === "dark" ? "bg-red-900/30" : theme === "bw" ? "bg-slate-200" : "bg-red-50"
                    : theme === "dark" ? "bg-orange-900/30" : theme === "bw" ? "bg-slate-100" : "bg-orange-50"
                }`}>
                  <p className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    {simulationInsights.viabilidade === 'sim' ? '✅ Viável' : simulationInsights.viabilidade === 'nao' ? '❌ Não recomendado' : '⚠️ Viável com atenção'}
                  </p>
                  <p className={`text-sm font-semibold ${
                    simulationInsights.viabilidade === 'sim'
                      ? theme === "dark" ? "text-green-300" : "text-green-700"
                      : simulationInsights.viabilidade === 'nao'
                      ? theme === "dark" ? "text-red-300" : "text-red-700"
                      : theme === "dark" ? "text-orange-300" : "text-orange-700"
                  }`}>
                    {simulationInsights.mensagem}
                  </p>
                </div>

                {/* Impacto */}
                <div className="mb-4">
                  <p className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    IMPACTO FINANCEIRO
                  </p>
                  <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    {simulationInsights.impacto}
                  </p>
                </div>

                {/* Dicas */}
                {simulationInsights.dicas && simulationInsights.dicas.length > 0 && (
                  <div className="mb-4">
                    <p className={`text-xs font-semibold mb-2 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      💡 DICAS PRÁTICAS
                    </p>
                    <div className="space-y-2">
                      {simulationInsights.dicas.map((dica: string, idx: number) => (
                        <div key={idx} className={`p-2 rounded-lg ${
                          theme === "dark" ? "bg-slate-700/30" : theme === "bw" ? "bg-slate-50" : "bg-blue-50/50"
                        }`}>
                          <p className={`text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                            • {dica}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternativas */}
                {simulationInsights.alternativas && simulationInsights.alternativas.length > 0 && (
                  <div>
                    <p className={`text-xs font-semibold mb-2 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      🔄 ALTERNATIVAS
                    </p>
                    <div className="space-y-2">
                      {simulationInsights.alternativas.map((alt: string, idx: number) => (
                        <div key={idx} className={`p-2 rounded-lg ${
                          theme === "dark" ? "bg-slate-700/30" : theme === "bw" ? "bg-slate-50" : "bg-purple-50/50"
                        }`}>
                          <p className={`text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                            • {alt}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            ) : null}
          </motion.div>
        )}

        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
              Calculando projeções...
            </p>
          </GlassCard>
        ) : (
          <>
            {/* Saldo Atual e Contas */}
            <GlassCard className="p-6 mb-6">
              <div className="mb-4">
                <p className={`text-sm mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  Saldo Total Atual
                </p>
                <p className={`text-3xl font-bold ${getBalanceColor(currentBalance)}`}>
                  R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {accounts.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-slate-200/50">
                  <p className={`text-xs font-semibold mb-2 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    SUAS CONTAS
                  </p>
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{account.icon}</span>
                        <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                          {account.name}
                        </span>
                      </div>
                      <span className={`text-sm font-semibold ${getBalanceColor(account.current_balance)}`}>
                        R$ {account.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Insights Automáticos de IA */}
            {!activeSimulation && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                {loadingFutureInsights ? (
                  <GlassCard className="p-6 text-center">
                    <div className="text-3xl mb-2">🤖</div>
                    <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                      Gerando análise inteligente...
                    </p>
                  </GlassCard>
                ) : futureInsights ? (
                  <GlassCard className={`p-5 ${
                    futureInsights.tipo === 'positivo'
                      ? theme === "dark" ? "bg-green-900/20" : theme === "bw" ? "bg-slate-50" : "bg-green-50/50"
                      : futureInsights.tipo === 'alerta'
                      ? theme === "dark" ? "bg-orange-900/20" : theme === "bw" ? "bg-slate-50" : "bg-orange-50/50"
                      : ""
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🤖</span>
                        <h3 className={`text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                          {futureInsights.titulo}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {insightsCached && !loadingFutureInsights && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            theme === "dark"
                              ? "bg-slate-700/50 text-slate-400"
                              : theme === "bw"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-white/70 text-slate-500"
                          }`}>
                            📦 Cache
                          </span>
                        )}
                        <button
                          onClick={handleRefreshInsights}
                          disabled={loadingFutureInsights}
                          className={`p-2 rounded-full transition-all ${
                            loadingFutureInsights
                              ? theme === "dark"
                                ? "bg-slate-700/30 text-slate-500 cursor-not-allowed"
                                : theme === "bw"
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-white/50 text-slate-400 cursor-not-allowed"
                              : theme === "dark"
                              ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700 active:scale-95"
                              : theme === "bw"
                              ? "bg-white text-slate-600 hover:bg-slate-50 active:scale-95"
                              : "bg-white/70 text-slate-600 hover:bg-white active:scale-95"
                          }`}
                          title={loadingFutureInsights ? "Atualizando..." : "Atualizar análise"}
                        >
                          <span className={`text-lg ${loadingFutureInsights ? 'animate-spin inline-block' : ''}`}>
                            {loadingFutureInsights ? '⏳' : '🔄'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <p className={`text-sm mb-4 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                      {futureInsights.mensagem}
                    </p>

                    {/* Destaques */}
                    {futureInsights.destaques && futureInsights.destaques.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {futureInsights.destaques.map((destaque: any, idx: number) => (
                          <div key={idx} className={`p-2 rounded-lg ${
                            theme === "dark" ? "bg-slate-700/30" : theme === "bw" ? "bg-white" : "bg-white/70"
                          }`}>
                            <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                              {destaque.titulo}
                            </p>
                            <p className={`text-sm font-bold ${
                              destaque.tipo === 'positivo'
                                ? theme === "dark" ? "text-green-400" : "text-green-600"
                                : destaque.tipo === 'negativo'
                                ? theme === "dark" ? "text-red-400" : "text-red-600"
                                : theme === "dark" ? "text-slate-200" : "text-slate-800"
                            }`}>
                              {destaque.valor}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dicas */}
                    {futureInsights.dicas && futureInsights.dicas.length > 0 && (
                      <div>
                        <p className={`text-xs font-semibold mb-2 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                          💡 RECOMENDAÇÕES
                        </p>
                        <div className="space-y-1.5">
                          {futureInsights.dicas.map((dica: string, idx: number) => (
                            <div key={idx} className={`p-2 rounded-lg ${
                              theme === "dark" ? "bg-slate-700/30" : theme === "bw" ? "bg-white" : "bg-blue-50/50"
                            }`}>
                              <p className={`text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                                • {dica}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </GlassCard>
                ) : null}
              </motion.div>
            )}

            {/* Alertas */}
            {alerts.length > 0 && (
              <div className="space-y-3 mb-6">
                {alerts.map((alert, idx) => {
                  const dateInfo = formatDate(alert.date)
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <GlassCard className={`p-4 ${getAlertColor(alert.type)}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {alert.type === 'negative' ? '⚠️' : '💡'}
                          </span>
                          <div className="flex-1">
                            <p className={`font-semibold text-sm ${getAlertTextColor(alert.type)}`}>
                              {alert.message}
                            </p>
                            <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                              {dateInfo.text} ({dateInfo.subtext})
                            </p>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Linha do Tempo de Projeções */}
            <div className="space-y-2">
              <h2 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                Projeção Diária
              </h2>

              {projections.map((projection, index) => {
                const dateInfo = formatDate(projection.date)
                const isExpanded = expandedDate === projection.date
                const hasTransactions = projection.transactions.length > 0

                return (
                  <motion.div
                    key={projection.date}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <GlassCard
                      className={`p-4 cursor-pointer transition-all ${
                        hasTransactions ? 'hover:shadow-md' : ''
                      } ${projection.isNegative ? (theme === "bw" ? "ring-2 ring-slate-400" : "ring-2 ring-red-300") : ''}`}
                      onClick={() => hasTransactions && setExpandedDate(isExpanded ? null : projection.date)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                              {dateInfo.text}
                            </p>
                            <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                              {dateInfo.subtext}
                            </p>
                          </div>

                          {hasTransactions && (
                            <div className={`ml-2 px-2 py-1 rounded-lg text-xs font-medium ${
                              theme === "bw" ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {projection.transactions.length} {projection.transactions.length === 1 ? 'lançamento' : 'lançamentos'}
                            </div>
                          )}
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className={`text-lg font-bold ${getBalanceColor(projection.balance)}`}>
                              R$ {projection.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            {projection.isNegative && (
                              <p className={`text-xs ${theme === "bw" ? "text-slate-600" : "text-red-600"}`}>
                                Saldo negativo
                              </p>
                            )}
                          </div>
                          {hasTransactions && (
                            <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Transações Expandidas */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-slate-200/50"
                          >
                            <div className="space-y-2">
                              {projection.transactions.map((tx, txIdx) => (
                                <div
                                  key={txIdx}
                                  className={`p-3 rounded-xl ${
                                    theme === "bw" ? "bg-slate-50" :
                                    tx.type === 'income' ? "bg-emerald-50" : "bg-pink-50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">{tx.category?.icon || '💰'}</span>
                                      <div>
                                        <p className={`text-sm font-semibold ${theme === "dark" ? "text-slate-800" : "text-slate-800"}`}>
                                          {tx.description}
                                        </p>
                                        {tx.isRecurring && (
                                          <p className={`text-xs ${theme === "dark" ? "text-slate-600" : "text-slate-500"}`}>
                                            🔄 Recorrente
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <p className={`text-sm font-bold ${
                                      tx.type === 'income'
                                        ? (theme === "bw" ? "text-slate-900" : "text-emerald-600")
                                        : (theme === "bw" ? "text-slate-900" : "text-pink-600")
                                    }`}>
                                      {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </div>

            {/* Informação sobre Simulações */}
            <GlassCard className="p-6 mt-6 text-center">
              <div className="text-3xl mb-2">💡</div>
              <p className={`text-sm font-semibold mb-1 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                Previsibilidade Financeira
              </p>
              <p className={`text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                Esta projeção considera suas contas recorrentes ativas e o saldo atual das suas contas. Crie contas recorrentes para automatizar lançamentos futuros.
              </p>
            </GlassCard>
          </>
        )}
      </motion.div>

      {/* Botão Flutuante - Simulador */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsSimulatorOpen(true)}
        className={`fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-40 ${
          theme === "dark"
            ? "bg-blue-600 hover:bg-blue-700"
            : theme === "bw"
            ? "bg-slate-800 hover:bg-slate-900"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        <span className="text-2xl">💡</span>
      </motion.button>

      {/* Modal do Simulador */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        currentBalance={currentBalance}
        onSimulate={handleSimulate}
      />
    </div>
  )
}
