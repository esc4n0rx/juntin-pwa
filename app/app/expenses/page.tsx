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

type Category = {
  id: string
  name: string
  icon: string
  color?: string
  type?: string
}

type Account = {
  id: string
  name: string
  icon: string
  type: string
  current_balance: number
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
    color?: string
  }
  account?: {
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

const getSaoPauloDate = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export default function ExpensesPage() {
  const theme = useAppStore((state) => state.theme)
  const mode = useAppStore((state) => state.mode)
  const setMode = useAppStore((state) => state.setMode)
  const setUser = useAppStore((state) => state.setUser)
  const setPartnerEmail = useAppStore((state) => state.setPartnerEmail)
  const setPartnerAvatar = useAppStore((state) => state.setPartnerAvatar)

  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<"income" | "expense">("expense")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedAccount, setSelectedAccount] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(getSaoPauloDate)
  const [description, setDescription] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState("monthly")
  const [dayOfMonth, setDayOfMonth] = useState("1")
  const [dayOfWeek, setDayOfWeek] = useState("0")
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [selectedDate, setSelectedDate] = useState(getSaoPauloDate)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Sincronizar dados do usuário do banco com o store
  useEffect(() => {
    const syncUserData = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()

        if (response.ok && data.user) {
          // Atualizar store com dados do banco
          if (data.user.mode) {
            setMode(data.user.mode)
          }
          if (data.user.name && data.user.email) {
            setUser({
              name: data.user.name,
              email: data.user.email,
              avatar: data.user.avatar
            })
          }
          if (data.user.partner) {
            setPartnerEmail(data.user.partner.email)
            if (data.user.partner.avatar) {
              setPartnerAvatar(data.user.partner.avatar)
            }
          }
        }
      } catch (error) {
        console.error('Erro ao sincronizar dados do usuário:', error)
      }
    }

    syncUserData()
  }, [])

  // Buscar categorias e transações do dia
  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Buscar contas
      const accountsRes = await fetch('/api/accounts')
      const accountsData = await accountsRes.json()

      if (accountsRes.ok && accountsData.accounts) {
        setAccounts(accountsData.accounts)
        // Se não tem conta selecionada e há contas disponíveis, selecionar a primeira
        if (!selectedAccount && accountsData.accounts.length > 0) {
          setSelectedAccount(accountsData.accounts[0].id)
        }
      }

      // Buscar categorias
      const categoriesRes = await fetch('/api/categories')
      const categoriesData = await categoriesRes.json()

      if (categoriesRes.ok && categoriesData.categories) {
        setCategories(categoriesData.categories)
      }

      // Buscar transações da data selecionada
      const transactionsRes = await fetch(`/api/transactions?date=${selectedDate}`)
      const transactionsData = await transactionsRes.json()

      if (transactionsRes.ok && transactionsData.transactions) {
        setTransactions(transactionsData.transactions)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setType(transaction.type)
    setSelectedCategory(transaction.category?.id || "")
    setSelectedAccount(transaction.account?.id || "")
    setAmount(transaction.amount.toString().replace(".", ","))
    setDate(transaction.date)
    setDescription(transaction.description || "")
    setIsRecurring(false)
    setShowForm(true)
  }

  const handleDelete = async (transactionId: string) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) {
      return
    }

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir lançamento')
      }

      toast.success('Lançamento excluído!')
      fetchData()
    } catch (error: any) {
      console.error('Erro ao excluir:', error)
      toast.error(error.message || 'Erro ao excluir lançamento')
    }
  }

  const handleSubmit = async () => {
    if (!selectedCategory) {
      toast.error("Selecione uma categoria")
      return
    }

    if (!selectedAccount) {
      toast.error("Selecione uma conta")
      return
    }

    // Converter vírgula para ponto antes de validar
    const normalizedAmount = amount.replace(",", ".")
    if (!normalizedAmount || Number.parseFloat(normalizedAmount) <= 0) {
      toast.error("Digite um valor válido")
      return
    }

    try {
      // Se é recorrente, criar conta recorrente em vez de transação
      if (isRecurring && !editingTransaction) {
        const recurringResponse = await fetch('/api/recurring', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: description || categories.find(c => c.id === selectedCategory)?.name || "Conta recorrente",
            amount: Number.parseFloat(normalizedAmount),
            type,
            frequency,
            day_of_month: frequency === 'monthly' ? Number(dayOfMonth) : null,
            day_of_week: (frequency === 'weekly' || frequency === 'biweekly') ? Number(dayOfWeek) : null,
            start_date: date,
            category_id: selectedCategory,
            account_id: selectedAccount,
          }),
        })

        const recurringData = await recurringResponse.json()

        if (!recurringResponse.ok) {
          throw new Error(recurringData.error || 'Erro ao criar conta recorrente')
        }

        toast.success('Conta recorrente criada!')
      } else {
        // Lançamento único
        const url = editingTransaction
          ? `/api/transactions/${editingTransaction.id}`
          : '/api/transactions'

        const response = await fetch(url, {
          method: editingTransaction ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            category_id: selectedCategory,
            amount: Number.parseFloat(normalizedAmount),
            date,
            description: description || null,
            account_id: selectedAccount,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao salvar lançamento')
        }

        toast.success(editingTransaction
          ? 'Lançamento atualizado!'
          : `${type === "income" ? "Receita" : "Despesa"} adicionada!`)
      }

      // Reset form
      setSelectedCategory("")
      setAmount("")
      setDate(getSaoPauloDate())
      setDescription("")
      setIsRecurring(false)
      setFrequency("monthly")
      setDayOfMonth("1")
      setDayOfWeek("0")
      setShowForm(false)
      setEditingTransaction(null)

      // Recarregar transações
      fetchData()
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast.error(error.message || 'Erro ao salvar lançamento')
    }
  }

  const recentTransactions = transactions

  return (
    <div className="p-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Despesas</h1>
          <Button
            onClick={() => {
              if (showForm) {
                setShowForm(false)
                setEditingTransaction(null)
                setSelectedCategory("")
                setAmount("")
                setDate(getSaoPauloDate())
                setDescription("")
              } else {
                setShowForm(true)
              }
            }}
            className={`rounded-2xl ${
              theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : theme === "bw" ? "bg-slate-800" : "bg-blue-500"
            } hover:opacity-90`}
          >
            {showForm ? "Cancelar" : "+ Adicionar"}
          </Button>
        </div>

        {/* Filtro de Data */}
        <GlassCard className="p-4 mb-6">
          <div className="flex items-center gap-2">
            {/* BOTÃO HOJE */}
            <Button
              onClick={() => {
                setSelectedDate(getSaoPauloDate())
                setShowDatePicker(false)
              }}
              variant={selectedDate === getSaoPauloDate() ? "default" : "outline"}
              className={`flex-1 h-10 rounded-xl text-sm ${
                selectedDate === getSaoPauloDate()
                  ? theme === "dark" ? "bg-blue-600" : theme === "bw" ? "bg-slate-800" : "bg-blue-500"
                  : theme === "dark" ? "bg-transparent border-slate-600 text-slate-300" : "bg-transparent"
              }`}
            >
              Hoje
            </Button>

            {(() => {
              const yesterday = new Date()
              yesterday.setDate(yesterday.getDate() - 1)
              const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
              return (
                <Button
                  onClick={() => {
                    setSelectedDate(yesterdayStr)
                    setShowDatePicker(false)
                  }}
                  variant={selectedDate === yesterdayStr ? "default" : "outline"}
                  className={`flex-1 h-10 rounded-xl text-sm ${
                    selectedDate === yesterdayStr
                      ? theme === "dark" ? "bg-blue-600" : theme === "bw" ? "bg-slate-800" : "bg-blue-500"
                      : theme === "dark" ? "bg-transparent border-slate-600 text-slate-300" : "bg-transparent"
                  }`}
                >
                  Ontem
                </Button>
              )
            })()}
            <Button
              onClick={() => setShowDatePicker(!showDatePicker)}
              variant={showDatePicker ? "default" : "outline"}
              className={`flex-1 h-10 rounded-xl text-sm ${
                showDatePicker
                  ? theme === "dark" ? "bg-blue-600" : theme === "bw" ? "bg-slate-800" : "bg-blue-500"
                  : theme === "dark" ? "bg-transparent border-slate-600 text-slate-300" : "bg-transparent"
              }`}
            >
              {showDatePicker ? "Fechar" : "Escolher"}
            </Button>
          </div>

          <AnimatePresence>
            {showDatePicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setShowDatePicker(false)
                  }}
                  className="h-12 rounded-xl"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-3 text-center">
            <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
              {selectedDate === getSaoPauloDate()
                ? "Hoje"
                : new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
            </p>
          </div>
        </GlassCard>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-6 mb-6">
                {editingTransaction && (
                  <div className="mb-4 text-center">
                    <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Editando lançamento</p>
                  </div>
                )}
                <div className="flex gap-2 mb-6">
                  <Button
                    onClick={() => setType("expense")}
                    variant={type === "expense" ? "default" : "outline"}
                    className={`flex-1 h-12 rounded-xl ${
                      type === "expense"
                        ? theme === "dark"
                          ? "bg-pink-600 hover:bg-pink-700"
                          : theme === "bw"
                          ? "bg-slate-800"
                          : "bg-pink-500"
                        : theme === "dark"
                        ? "bg-transparent border-slate-600 text-slate-300"
                        : "bg-transparent"
                    }`}
                  >
                    Despesa
                  </Button>
                  <Button
                    onClick={() => setType("income")}
                    variant={type === "income" ? "default" : "outline"}
                    className={`flex-1 h-12 rounded-xl ${
                      type === "income"
                        ? theme === "dark"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : theme === "bw"
                          ? "bg-slate-800"
                          : "bg-emerald-500"
                        : theme === "dark"
                        ? "bg-transparent border-slate-600 text-slate-300"
                        : "bg-transparent"
                    }`}
                  >
                    Receita
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className={`mb-2 block ${theme === "dark" ? "text-white" : ""}`}>Categoria</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from(new Map(categories.map(cat => [cat.id, cat])).values()).map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`p-3 rounded-xl transition-all ${
                            selectedCategory === category.id
                              ? theme === "dark"
                                ? "bg-blue-900/50 ring-2 ring-blue-500"
                                : theme === "bw"
                                ? "bg-slate-200 ring-2 ring-slate-800"
                                : "bg-blue-100 ring-2 ring-blue-400"
                              : theme === "dark"
                              ? "bg-slate-700/50"
                              : "bg-slate-200/50"
                          }`}
                        >
                          <div className="text-2xl mb-1">{category.icon}</div>
                          <p className={`text-xs font-medium truncate ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>{category.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className={`mb-2 block ${theme === "dark" ? "text-white" : ""}`}>Conta</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          onClick={() => setSelectedAccount(account.id)}
                          className={`p-3 rounded-xl transition-all ${
                            selectedAccount === account.id
                              ? theme === "dark"
                                ? "bg-blue-900/50 ring-2 ring-blue-500"
                                : theme === "bw"
                                ? "bg-slate-200 ring-2 ring-slate-800"
                                : "bg-blue-100 ring-2 ring-blue-400"
                              : theme === "dark"
                              ? "bg-slate-700/50"
                              : "bg-slate-200/50"
                          }`}
                        >
                          <div className="text-xl mb-1">{account.icon}</div>
                          <p className={`text-xs font-medium truncate ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>{account.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {!editingTransaction && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="isRecurring"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <Label htmlFor="isRecurring" className={`cursor-pointer ${theme === "dark" ? "text-white" : ""}`}>
                          Tornar recorrente
                        </Label>
                      </div>
                      {isRecurring && (
                        <div className={`space-y-3 mt-3 p-3 rounded-xl ${
                          theme === "dark" ? "bg-blue-900/20" : "bg-blue-50/50"
                        }`}>
                          <div>
                            <Label className={`mb-2 block text-sm ${theme === "dark" ? "text-white" : ""}`}>Frequência</Label>
                            <select
                              value={frequency}
                              onChange={(e) => setFrequency(e.target.value)}
                              className={`w-full h-10 rounded-xl border px-3 text-sm ${
                                theme === "dark"
                                  ? "bg-slate-700 border-slate-600 text-white"
                                  : "bg-white border-slate-200"
                              }`}
                            >
                              <option value="daily">Diária</option>
                              <option value="weekly">Semanal</option>
                              <option value="biweekly">Quinzenal</option>
                              <option value="monthly">Mensal</option>
                              <option value="yearly">Anual</option>
                            </select>
                          </div>
                          {frequency === 'monthly' && (
                            <div>
                              <Label className={`mb-2 block text-sm ${theme === "dark" ? "text-white" : ""}`}>Dia do mês</Label>
                              <Input
                                type="number"
                                min="1"
                                max="31"
                                value={dayOfMonth}
                                onChange={(e) => setDayOfMonth(e.target.value)}
                                className={`h-10 rounded-xl text-sm ${
                                  theme === "dark" ? "bg-slate-700 border-slate-600 text-white" : ""
                                }`}
                              />
                            </div>
                          )}
                          {(frequency === 'weekly' || frequency === 'biweekly') && (
                            <div>
                              <Label className={`mb-2 block text-sm ${theme === "dark" ? "text-white" : ""}`}>Dia da semana</Label>
                              <select
                                value={dayOfWeek}
                                onChange={(e) => setDayOfWeek(e.target.value)}
                                className={`w-full h-10 rounded-xl border px-3 text-sm ${
                                  theme === "dark"
                                    ? "bg-slate-700 border-slate-600 text-white"
                                    : "bg-white border-slate-200"
                                }`}
                              >
                                <option value="0">Domingo</option>
                                <option value="1">Segunda</option>
                                <option value="2">Terça</option>
                                <option value="3">Quarta</option>
                                <option value="4">Quinta</option>
                                <option value="5">Sexta</option>
                                <option value="6">Sábado</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="amount" className={`mb-2 block ${theme === "dark" ? "text-white" : ""}`}>
                      Valor
                    </Label>
                    <Input
                      id="amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={amount}
                      onChange={(e) => {
                        const value = e.target.value
                        // Permite apenas números, vírgula e ponto
                        const sanitized = value.replace(/[^\d,]/g, "")
                        // Garante apenas uma vírgula
                        const parts = sanitized.split(",")
                        if (parts.length > 2) {
                          setAmount(parts[0] + "," + parts.slice(1).join(""))
                        } else {
                          setAmount(sanitized)
                        }
                      }}
                      className={`h-12 rounded-xl text-lg ${
                        theme === "dark" ? "bg-slate-700 border-slate-600 text-white" : ""
                      }`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="date" className={`mb-2 block ${theme === "dark" ? "text-white" : ""}`}>
                      Data
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`h-12 rounded-xl ${
                        theme === "dark" ? "bg-slate-700 border-slate-600 text-white" : ""
                      }`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className={`mb-2 block ${theme === "dark" ? "text-white" : ""}`}>
                      Observação (opcional)
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Adicione uma observação..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`rounded-xl resize-none ${
                        theme === "dark" ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" : ""
                      }`}
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className={`w-full h-12 rounded-xl ${
                      theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-800"
                    } hover:opacity-90`}
                  >
                    {editingTransaction ? "Atualizar" : "Salvar"}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
          Lançamentos {selectedDate === getSaoPauloDate() ? "de Hoje" : ""}
        </h3>

        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>Carregando...</p>
          </GlassCard>
        ) : recentTransactions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">💸</div>
            <p className={`mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
              Nenhum lançamento {selectedDate === getSaoPauloDate() ? "hoje" : "nesta data"}
            </p>
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Clique em Adicionar para começar</p>
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
                <div style={{ WebkitTouchCallout: 'none' }}>
                  <GlassCard className={`p-4 relative select-none ${mode === "couple" ? "pt-10" : ""}`}>
                    {mode === "couple" && transaction.user && (
                    <div
                      className={`absolute top-2 left-2 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        theme === "dark"
                          ? "bg-blue-900/50 text-blue-300"
                          : theme === "bw"
                          ? "bg-slate-200 text-slate-800"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {transaction.user.full_name}
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => handleEdit(transaction)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors select-none ${
                        theme === "dark"
                          ? "bg-blue-900/50 hover:bg-blue-800/50"
                          : theme === "bw"
                          ? "bg-slate-200 hover:bg-slate-300"
                          : "bg-blue-100 hover:bg-blue-200"
                      }`}
                      title="Editar"
                      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
                    >
                      <span className="text-sm">✏️</span>
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors select-none ${
                        theme === "dark"
                          ? "bg-red-900/50 hover:bg-red-800/50"
                          : "bg-red-100 hover:bg-red-200"
                      }`}
                      title="Excluir"
                      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
                    >
                      <span className="text-sm">🗑️</span>
                    </button>
                  </div>

                    <div className="flex items-center justify-between pr-20">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                          transaction.type === "income"
                            ? theme === "dark"
                              ? "bg-emerald-900/50"
                              : theme === "bw"
                              ? "bg-slate-200"
                              : "bg-emerald-100"
                            : theme === "dark"
                              ? "bg-pink-900/50"
                              : theme === "bw"
                              ? "bg-slate-200"
                              : "bg-pink-100"
                        }`}
                      >
                        {transaction.category?.icon || "💰"}
                      </div>
                      <div>
                        <h4 className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{transaction.category?.name || "Sem categoria"}</h4>
                        <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                          {new Date(transaction.date).toLocaleDateString("pt-BR")}
                        </p>
                        {transaction.description && (
                          <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>{transaction.description}</p>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        transaction.type === "income"
                          ? theme === "dark"
                            ? "text-emerald-400"
                            : theme === "bw"
                            ? "text-slate-900"
                            : "text-emerald-600"
                          : theme === "dark"
                            ? "text-pink-400"
                            : theme === "bw"
                            ? "text-slate-900"
                            : "text-pink-600"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"} R${" "}
                      {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  </GlassCard>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
