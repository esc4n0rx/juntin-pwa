"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

const INVESTMENT_ICONS = ["💰", "📈", "💵", "🏦", "💳", "🪙", "💎", "🏆"]
const INVESTMENT_TYPES = [
  "CDB",
  "Tesouro Direto",
  "Ações",
  "Fundos Imobiliários",
  "Fundos de Investimento",
  "LCI/LCA",
  "Debêntures",
  "Poupança",
  "Cripto",
  "Outro"
]

type Investment = {
  id: string
  name: string
  type: string
  icon: string
  initial_amount: number
  current_amount: number
  target_amount?: number
  institution?: string
  contributions_count: number
  user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

type Contribution = {
  id: string
  amount: number
  date: string
  description?: string
  user?: {
    id: string
    full_name: string
  }
}

export default function InvestingPage() {
  const theme = useAppStore((state) => state.theme)
  const mode = useAppStore((state) => state.mode)
  const setMode = useAppStore((state) => state.setMode)

  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showContributeForm, setShowContributeForm] = useState<string | null>(null)
  const [showContributions, setShowContributions] = useState<string | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])

  // Form states
  const [name, setName] = useState("")
  const [type, setType] = useState(INVESTMENT_TYPES[0])
  const [selectedIcon, setSelectedIcon] = useState("💰")
  const [initialAmount, setInitialAmount] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [institution, setInstitution] = useState("")

  // Contribute form states
  const [contributeAmount, setContributeAmount] = useState("")
  const [contributeDate, setContributeDate] = useState(new Date().toISOString().split("T")[0])
  const [contributeDescription, setContributeDescription] = useState("")

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

  // Buscar investimentos
  useEffect(() => {
    fetchInvestments()
  }, [])

  const fetchInvestments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/investments')
      const data = await response.json()

      if (response.ok && data.investments) {
        setInvestments(data.investments)
      }
    } catch (error) {
      console.error('Erro ao carregar investimentos:', error)
      toast.error('Erro ao carregar investimentos')
    } finally {
      setLoading(false)
    }
  }

  const fetchContributions = async (investmentId: string) => {
    try {
      const response = await fetch(`/api/investments/contribute?investment_id=${investmentId}`)
      const data = await response.json()

      if (response.ok && data.contributions) {
        setContributions(data.contributions)
      }
    } catch (error) {
      console.error('Erro ao carregar aportes:', error)
      toast.error('Erro ao carregar aportes')
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Digite um nome para o investimento")
      return
    }
    if (initialAmount && Number.parseFloat(initialAmount) < 0) {
      toast.error("Valor inicial inválido")
      return
    }

    try {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          type,
          icon: selectedIcon,
          initial_amount: initialAmount ? Number.parseFloat(initialAmount) : 0,
          target_amount: targetAmount ? Number.parseFloat(targetAmount) : null,
          institution: institution.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar investimento')
      }

      toast.success("Investimento criado!")

      // Reset form
      setName("")
      setType(INVESTMENT_TYPES[0])
      setSelectedIcon("💰")
      setInitialAmount("")
      setTargetAmount("")
      setInstitution("")
      setShowForm(false)

      // Recarregar investimentos
      fetchInvestments()
    } catch (error: any) {
      console.error('Erro ao criar investimento:', error)
      toast.error(error.message || 'Erro ao criar investimento')
    }
  }

  const handleContribute = async (investmentId: string) => {
    if (!contributeAmount || Number.parseFloat(contributeAmount) <= 0) {
      toast.error("Digite um valor válido")
      return
    }

    try {
      const response = await fetch('/api/investments/contribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investment_id: investmentId,
          amount: Number.parseFloat(contributeAmount),
          date: contributeDate,
          description: contributeDescription || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao adicionar aporte')
      }

      toast.success("Aporte adicionado!")

      // Reset form
      setContributeAmount("")
      setContributeDate(new Date().toISOString().split("T")[0])
      setContributeDescription("")
      setShowContributeForm(null)

      // Recarregar investimentos
      fetchInvestments()
    } catch (error: any) {
      console.error('Erro ao adicionar aporte:', error)
      toast.error(error.message || 'Erro ao adicionar aporte')
    }
  }

  const handleDeleteInvestment = async (investmentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este investimento?")) return

    try {
      const response = await fetch('/api/investments', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: investmentId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao deletar investimento')
      }

      toast.success("Investimento removido")
      fetchInvestments()
    } catch (error: any) {
      console.error('Erro ao deletar investimento:', error)
      toast.error(error.message || 'Erro ao deletar investimento')
    }
  }

  const totalInvested = investments.reduce((sum, inv) => sum + inv.current_amount, 0)
  const totalInitial = investments.reduce((sum, inv) => sum + inv.initial_amount, 0)
  const totalGrowth = totalInvested - totalInitial

  return (
    <div className="p-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Investimentos</h1>
          <Button
            onClick={() => setShowForm(!showForm)}
            className={`rounded-2xl ${theme === "bw" ? "bg-slate-800" : "bg-blue-500"} hover:opacity-90`}
          >
            {showForm ? "Cancelar" : "+ Novo"}
          </Button>
        </div>

        {/* Formulário de Novo Investimento */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-6 mb-6">
                <h3 className="font-bold text-slate-800 mb-4">Novo Investimento</h3>

                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Escolha um ícone</Label>
                    <div className="flex gap-2 flex-wrap">
                      {INVESTMENT_ICONS.map((icon) => (
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
                      Nome do Investimento
                    </Label>
                    <Input
                      id="name"
                      placeholder="Ex: Tesouro Selic 2027"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="type" className="mb-2 block">
                      Tipo
                    </Label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full h-12 rounded-xl border border-slate-200 px-3 bg-white"
                    >
                      {INVESTMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="institution" className="mb-2 block">
                      Instituição (opcional)
                    </Label>
                    <Input
                      id="institution"
                      placeholder="Ex: Nubank, XP, Rico"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="initialAmount" className="mb-2 block">
                        Valor Inicial
                      </Label>
                      <Input
                        id="initialAmount"
                        type="number"
                        placeholder="0,00"
                        value={initialAmount}
                        onChange={(e) => setInitialAmount(e.target.value)}
                        className="h-12 rounded-xl text-lg"
                      />
                    </div>

                    <div>
                      <Label htmlFor="targetAmount" className="mb-2 block">
                        Meta (opcional)
                      </Label>
                      <Input
                        id="targetAmount"
                        type="number"
                        placeholder="0,00"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        className="h-12 rounded-xl text-lg"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className={`w-full h-12 rounded-xl ${theme === "bw" ? "bg-slate-800" : "bg-slate-800"} hover:opacity-90`}
                  >
                    Criar Investimento
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resumo */}
        {!loading && investments.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <GlassCard variant="blue" className="p-4">
              <div className="text-xs text-slate-600 mb-1">Total Investido</div>
              <div className={`text-lg font-bold ${theme === "bw" ? "text-slate-900" : "text-blue-700"}`}>
                R$ {totalInvested.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </GlassCard>

            <GlassCard variant="green" className="p-4">
              <div className="text-xs text-slate-600 mb-1">Rentabilidade</div>
              <div className={`text-lg font-bold ${totalGrowth >= 0 ? (theme === "bw" ? "text-slate-900" : "text-emerald-700") : "text-red-600"}`}>
                {totalGrowth >= 0 ? "+" : ""}R$ {totalGrowth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </GlassCard>

            <GlassCard variant="pink" className="p-4">
              <div className="text-xs text-slate-600 mb-1">Investimentos</div>
              <div className={`text-lg font-bold ${theme === "bw" ? "text-slate-900" : "text-pink-700"}`}>
                {investments.length}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Lista de Investimentos */}
        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-slate-600">Carregando investimentos...</p>
          </GlassCard>
        ) : investments.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">📈</div>
            <p className="text-slate-600 mb-2">Nenhum investimento ainda</p>
            <p className="text-sm text-slate-500">Crie investimentos para acompanhar seu patrimônio</p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {investments.map((investment, index) => {
              const growth = investment.current_amount - investment.initial_amount
              const growthPercentage = investment.initial_amount > 0
                ? ((growth / investment.initial_amount) * 100)
                : 0
              const progress = investment.target_amount
                ? (investment.current_amount / investment.target_amount) * 100
                : 0

              return (
                <motion.div
                  key={investment.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard className={`p-6 relative ${mode === "couple" ? "pt-10" : ""}`}>
                    {mode === "couple" && investment.user && (
                      <div
                        className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          theme === "bw"
                            ? "bg-slate-200 text-slate-800"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {investment.user.full_name}
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
                            theme === "bw" ? "bg-slate-200" : "bg-blue-100"
                          }`}
                        >
                          {investment.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{investment.name}</h3>
                          <p className="text-sm text-slate-600">{investment.type}</p>
                          {investment.institution && (
                            <p className="text-xs text-slate-500">{investment.institution}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteInvestment(investment.id)}
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
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Valor Atual</p>
                          <p className={`text-xl font-bold ${theme === "bw" ? "text-slate-900" : "text-blue-700"}`}>
                            R$ {investment.current_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Rentabilidade</p>
                          <p className={`text-xl font-bold ${growth >= 0 ? (theme === "bw" ? "text-slate-900" : "text-emerald-600") : "text-red-600"}`}>
                            {growth >= 0 ? "+" : ""}R$ {growth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            <span className="text-sm ml-1">
                              ({growthPercentage >= 0 ? "+" : ""}{growthPercentage.toFixed(1)}%)
                            </span>
                          </p>
                        </div>
                      </div>

                      {investment.target_amount && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-600">Meta: R$ {investment.target_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            <span className="text-xs font-bold text-slate-800">{Math.min(progress, 100).toFixed(0)}%</span>
                          </div>
                          <div className="relative h-2 bg-slate-200/50 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(progress, 100)}%` }}
                              transition={{ duration: 0.8 }}
                              className={`absolute h-full rounded-full ${
                                theme === "bw" ? "bg-slate-600" : "bg-emerald-500"
                              }`}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Aportes */}
                    <div className="flex gap-2 mb-3">
                      <Button
                        onClick={() => setShowContributeForm(showContributeForm === investment.id ? null : investment.id)}
                        variant="outline"
                        className="flex-1 h-10 rounded-xl text-sm"
                      >
                        + Adicionar Aporte
                      </Button>
                      <Button
                        onClick={() => {
                          if (showContributions === investment.id) {
                            setShowContributions(null)
                          } else {
                            fetchContributions(investment.id)
                            setShowContributions(investment.id)
                          }
                        }}
                        variant="outline"
                        className="flex-1 h-10 rounded-xl text-sm"
                      >
                        Ver Aportes ({investment.contributions_count})
                      </Button>
                    </div>

                    {/* Form de Aporte */}
                    <AnimatePresence>
                      {showContributeForm === investment.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`border-t pt-4 mt-4 ${theme === "bw" ? "border-slate-200" : "border-slate-200"}`}
                        >
                          <h4 className="font-semibold text-slate-800 mb-3">Adicionar Aporte</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="mb-2 block text-sm">Valor</Label>
                              <Input
                                type="number"
                                placeholder="0,00"
                                value={contributeAmount}
                                onChange={(e) => setContributeAmount(e.target.value)}
                                className="h-10 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label className="mb-2 block text-sm">Data</Label>
                              <Input
                                type="date"
                                value={contributeDate}
                                onChange={(e) => setContributeDate(e.target.value)}
                                className="h-10 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label className="mb-2 block text-sm">Observação (opcional)</Label>
                              <Textarea
                                placeholder="Ex: Aporte mensal"
                                value={contributeDescription}
                                onChange={(e) => setContributeDescription(e.target.value)}
                                className="rounded-xl resize-none"
                                rows={2}
                              />
                            </div>
                            <Button
                              onClick={() => handleContribute(investment.id)}
                              className={`w-full h-10 rounded-xl ${theme === "bw" ? "bg-slate-800" : "bg-emerald-600"} hover:opacity-90`}
                            >
                              Confirmar Aporte
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Lista de Aportes */}
                    <AnimatePresence>
                      {showContributions === investment.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`border-t pt-4 mt-4 ${theme === "bw" ? "border-slate-200" : "border-slate-200"}`}
                        >
                          <h4 className="font-semibold text-slate-800 mb-3">Histórico de Aportes</h4>
                          {contributions.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Nenhum aporte ainda</p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {contributions.map((contribution) => (
                                <div
                                  key={contribution.id}
                                  className={`p-3 rounded-xl ${theme === "bw" ? "bg-slate-100" : "bg-emerald-50"}`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`font-bold ${theme === "bw" ? "text-slate-900" : "text-emerald-700"}`}>
                                      + R$ {contribution.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {new Date(contribution.date).toLocaleDateString("pt-BR")}
                                    </span>
                                  </div>
                                  {contribution.description && (
                                    <p className="text-xs text-slate-600">{contribution.description}</p>
                                  )}
                                  {mode === "couple" && contribution.user && (
                                    <p className="text-xs text-slate-500 mt-1">Por {contribution.user.full_name}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
