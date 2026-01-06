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
  user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

export default function ExpensesPage() {
  const theme = useAppStore((state) => state.theme)
  const mode = useAppStore((state) => state.mode)
  const setMode = useAppStore((state) => state.setMode)
  const setUser = useAppStore((state) => state.setUser)
  const setPartnerEmail = useAppStore((state) => state.setPartnerEmail)
  const setPartnerAvatar = useAppStore((state) => state.setPartnerAvatar)

  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<"income" | "expense">("expense")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [longPressedId, setLongPressedId] = useState<string | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

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
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Buscar categorias
      const categoriesRes = await fetch('/api/categories')
      const categoriesData = await categoriesRes.json()

      if (categoriesRes.ok && categoriesData.categories) {
        setCategories(categoriesData.categories)
      }

      // Buscar transações do dia atual (timezone São Paulo)
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const transactionsRes = await fetch(`/api/transactions?date=${today}`)
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

  const handleLongPressStart = (transactionId: string) => {
    const timer = setTimeout(() => {
      setLongPressedId(transactionId)
    }, 500) // 500ms para ativar o long press
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setType(transaction.type)
    setSelectedCategory(transaction.category?.id || "")
    setAmount(transaction.amount.toString().replace(".", ","))
    setDate(transaction.date)
    setDescription(transaction.description || "")
    setShowForm(true)
    setLongPressedId(null)
  }

  const handleDelete = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir lançamento')
      }

      toast.success('Lançamento excluído!')
      setLongPressedId(null)
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

    // Converter vírgula para ponto antes de validar
    const normalizedAmount = amount.replace(",", ".")
    if (!normalizedAmount || Number.parseFloat(normalizedAmount) <= 0) {
      toast.error("Digite um valor válido")
      return
    }

    try {
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
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar lançamento')
      }

      toast.success(editingTransaction
        ? 'Lançamento atualizado!'
        : `${type === "income" ? "Receita" : "Despesa"} adicionada!`)

      // Reset form
      setSelectedCategory("")
      setAmount("")
      setDescription("")
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
          <h1 className="text-3xl font-bold text-slate-800">Despesas</h1>
          <Button
            onClick={() => {
              if (showForm) {
                setShowForm(false)
                setEditingTransaction(null)
                setSelectedCategory("")
                setAmount("")
                setDescription("")
              } else {
                setShowForm(true)
              }
            }}
            className={`rounded-2xl ${theme === "bw" ? "bg-slate-800" : "bg-blue-500"} hover:opacity-90`}
          >
            {showForm ? "Cancelar" : "+ Adicionar"}
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
                {editingTransaction && (
                  <div className="mb-4 text-center">
                    <p className="text-sm font-medium text-slate-600">Editando lançamento</p>
                  </div>
                )}
                <div className="flex gap-2 mb-6">
                  <Button
                    onClick={() => setType("expense")}
                    variant={type === "expense" ? "default" : "outline"}
                    className={`flex-1 h-12 rounded-xl ${
                      type === "expense" ? (theme === "bw" ? "bg-slate-800" : "bg-pink-500") : "bg-transparent"
                    }`}
                  >
                    Despesa
                  </Button>
                  <Button
                    onClick={() => setType("income")}
                    variant={type === "income" ? "default" : "outline"}
                    className={`flex-1 h-12 rounded-xl ${
                      type === "income" ? (theme === "bw" ? "bg-slate-800" : "bg-emerald-500") : "bg-transparent"
                    }`}
                  >
                    Receita
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Categoria</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from(new Map(categories.map(cat => [cat.id, cat])).values()).map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`p-3 rounded-xl transition-all ${
                            selectedCategory === category.id
                              ? theme === "bw"
                                ? "bg-slate-200 ring-2 ring-slate-800"
                                : "bg-blue-100 ring-2 ring-blue-400"
                              : "bg-slate-200/50"
                          }`}
                        >
                          <div className="text-2xl mb-1">{category.icon}</div>
                          <p className="text-xs font-medium text-slate-700 truncate">{category.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="amount" className="mb-2 block">
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
                      className="h-12 rounded-xl text-lg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="date" className="mb-2 block">
                      Data
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="mb-2 block">
                      Observação (opcional)
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Adicione uma observação..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="rounded-xl resize-none"
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className={`w-full h-12 rounded-xl ${theme === "bw" ? "bg-slate-800" : "bg-slate-800"} hover:opacity-90`}
                  >
                    {editingTransaction ? "Atualizar" : "Salvar"}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        <h3 className="text-lg font-bold text-slate-800 mb-4">Lançamentos de Hoje</h3>

        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-slate-600">Carregando...</p>
          </GlassCard>
        ) : recentTransactions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">💸</div>
            <p className="text-slate-600 mb-2">Nenhum lançamento hoje</p>
            <p className="text-sm text-slate-500">Clique em Adicionar para começar</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <GlassCard
                  className={`p-4 relative ${mode === "couple" ? "pt-10" : ""}`}
                  onTouchStart={() => handleLongPressStart(transaction.id)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchMove={handleLongPressEnd}
                  onMouseDown={() => handleLongPressStart(transaction.id)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                >
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
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
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
                      <div className={mode === "couple" ? "pr-20" : ""}>
                        <h4 className="font-semibold text-slate-800">{transaction.category?.name || "Sem categoria"}</h4>
                        <p className="text-xs text-slate-500">
                          {new Date(transaction.date).toLocaleDateString("pt-BR")}
                        </p>
                        {transaction.description && (
                          <p className="text-xs text-slate-600 mt-1">{transaction.description}</p>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-lg font-bold ${
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
                  </div>
                </GlassCard>

                {/* Menu contextual do long press */}
                <AnimatePresence>
                  {longPressedId === transaction.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-black/10 backdrop-blur-sm rounded-2xl"
                      onClick={() => setLongPressedId(null)}
                    >
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(transaction)
                        }}
                        className={`h-12 px-6 rounded-xl ${
                          theme === "bw" ? "bg-slate-800" : "bg-blue-500"
                        } hover:opacity-90 shadow-lg`}
                      >
                        ✏️ Editar
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(transaction.id)
                        }}
                        className="h-12 px-6 rounded-xl bg-red-500 hover:bg-red-600 shadow-lg"
                      >
                        🗑️ Excluir
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
