"use client"

import { useAppStore } from "@/lib/store"
import { GlassCard } from "@/components/glass-card"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { MigrationModal } from "@/components/migration-modal"

type Category = {
  id: string
  name: string
  icon: string
  color?: string
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
  type: "income" | "expense" | "transfer"
  amount: number
  date: string
  description?: string
  category?: {
    id: string
    name: string
    icon: string
  }
  account?: {
    id: string
    name: string
    icon: string
  }
  transfer?: {
    fromAccount?: {
      id: string
      name: string
      icon: string
    }
    toAccount?: {
      id: string
      name: string
      icon: string
    }
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
  const aiInsights = useAppStore((state) => state.aiInsights)
  const setMode = useAppStore((state) => state.setMode)
  const setUser = useAppStore((state) => state.setUser)
  const setPartnerEmail = useAppStore((state) => state.setPartnerEmail)
  const setPartnerAvatar = useAppStore((state) => state.setPartnerAvatar)

  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [needsMigration, setNeedsMigration] = useState(false)

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

        // 2. Verificar status de migração
        const migrationRes = await fetch('/api/accounts/migrate')
        if (migrationRes.ok) {
          const migrationData = await migrationRes.json()
          if (migrationData.needsMigration) {
            setNeedsMigration(true)
            setShowMigrationModal(true)
          }
        }

        // 3. Processar contas recorrentes (auto-lançamento)
        await fetch('/api/recurring/process', { method: 'POST' })

        // 4. Buscar contas
        const accountsRes = await fetch('/api/accounts')
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          if (accountsData.accounts) {
            setAccounts(accountsData.accounts)
          }
        }

        // 5. Buscar categorias
        const catRes = await fetch('/api/categories')
        if (catRes.ok) {
          const catData = await catRes.json()
          if (catData.categories) {
            setCategories(catData.categories)
          }
        }

        // 6. Buscar transações recentes (últimas 5)
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

  // Calcular saldo geral (soma de todas as contas)
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.current_balance), 0)

  // Calcular estatísticas baseadas em todas as transações
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)

  const recentTransactions = transactions.slice(0, 5)

  const handleMigrationComplete = () => {
    setNeedsMigration(false)
    // Recarregar dados
    window.location.reload()
  }

  return (
    <div className="p-6 pb-8">
      <MigrationModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        onMigrationComplete={handleMigrationComplete}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h2 className={`text-sm mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Olá,</h2>
          <h1 className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
            {user?.name || "Usuário"}
            {mode === "couple" && " 💑"}
          </h1>
        </div>

        <GlassCard variant="blue" className="p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Saldo Geral</span>
            <svg className={`w-5 h-5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Carregando...</h2>
          ) : (
            <>
              <h2 className={`text-4xl font-black mb-1 ${
                theme === "dark" ? "text-white" : theme === "bw" ? "text-slate-900" : "text-slate-800"
              }`}>
                R$ {totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h2>
              <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                {accounts.length > 1 ? `${accounts.length} contas` : accounts.length === 1 ? '1 conta' : 'Nenhuma conta'}
              </p>
            </>
          )}
        </GlassCard>

        {/* Cards de Contas */}
        {!loading && accounts.length > 0 && (
          <div className="mb-6">
            <h3 className={`text-sm font-bold mb-3 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
              Minhas Contas
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {accounts.map((account) => (
                <GlassCard key={account.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{account.icon}</span>
                    <span className={`text-xs font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                      {account.name}
                    </span>
                  </div>
                  <p className={`text-lg font-bold ${
                    account.current_balance >= 0
                      ? theme === "dark" ? "text-emerald-400" : theme === "bw" ? "text-slate-900" : "text-emerald-600"
                      : theme === "dark" ? "text-pink-400" : theme === "bw" ? "text-slate-900" : "text-pink-600"
                  }`}>
                    R$ {Number(account.current_balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <GlassCard variant="green" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  theme === "dark" ? "bg-emerald-900/50" : theme === "bw" ? "bg-slate-200" : "bg-emerald-400/30"
                }`}
              >
                <svg className={`w-5 h-5 ${theme === "dark" ? "text-emerald-400" : "text-emerald-700"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <span className={`text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Receitas</span>
            </div>
            <p className={`text-xl font-bold ${
              theme === "dark" ? "text-emerald-400" : theme === "bw" ? "text-slate-900" : "text-emerald-700"
            }`}>
              + R$ {totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </GlassCard>

          <GlassCard variant="pink" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  theme === "dark" ? "bg-pink-900/50" : theme === "bw" ? "bg-slate-200" : "bg-pink-400/30"
                }`}
              >
                <svg className={`w-5 h-5 ${theme === "dark" ? "text-pink-400" : "text-pink-700"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
              <span className={`text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Despesas</span>
            </div>
            <p className={`text-xl font-bold ${
              theme === "dark" ? "text-pink-400" : theme === "bw" ? "text-slate-900" : "text-pink-700"
            }`}>
              - R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </GlassCard>
        </div>

        {/* Badge de Dicas da IA */}
        {aiInsights && aiInsights.dicas && aiInsights.dicas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <GlassCard className={`p-5 ${
              theme === "dark" ? "bg-gradient-to-br from-purple-900/40 to-blue-900/40" : theme === "bw" ? "bg-slate-100" : "bg-gradient-to-br from-purple-50 to-blue-50"
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  theme === "dark" ? "bg-gradient-to-br from-purple-600 to-blue-600" : theme === "bw" ? "bg-slate-200" : "bg-gradient-to-br from-purple-500 to-blue-500"
                }`}>
                  <span className="text-white text-lg">💡</span>
                </div>
                <h3 className={`font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Dicas Personalizadas</h3>
              </div>
              <div className="space-y-2.5">
                {aiInsights.dicas.map((dica, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-start gap-3 p-3 rounded-xl ${
                      theme === "dark" ? "bg-slate-800/70" : theme === "bw" ? "bg-white" : "bg-white/70"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      theme === "dark"
                        ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white"
                        : theme === "bw"
                        ? "bg-slate-800 text-white"
                        : "bg-gradient-to-br from-purple-500 to-blue-500 text-white"
                    }`}>
                      {index + 1}
                    </div>
                    <p className={`text-sm flex-1 leading-relaxed ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>{dica}</p>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Transações Recentes</h3>
          <button className={`text-sm font-medium ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>Ver todas</button>
        </div>

        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>Carregando transações...</p>
          </GlassCard>
        ) : recentTransactions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className={`mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Nenhuma transação ainda</p>
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Comece adicionando suas receitas e despesas</p>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                          transaction.type === "income"
                            ? theme === "dark"
                              ? "bg-emerald-900/50"
                              : theme === "bw"
                              ? "bg-slate-200"
                              : "bg-emerald-100"
                            : transaction.type === "transfer"
                            ? theme === "dark"
                              ? "bg-blue-900/50"
                              : theme === "bw"
                              ? "bg-slate-200"
                              : "bg-blue-100"
                            : theme === "dark"
                              ? "bg-pink-900/50"
                              : theme === "bw"
                              ? "bg-slate-200"
                              : "bg-pink-100"
                        }`}
                      >
                        {transaction.type === "transfer"
                          ? "🔁"
                          : transaction.category?.icon || "💰"}
                      </div>
                      <div>
                        <h4 className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                          {transaction.type === "transfer"
                            ? "Transferência"
                            : transaction.category?.name || "Sem categoria"}
                        </h4>
                        <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                          {transaction.type === "transfer" ? (
                            <>
                              {transaction.transfer?.fromAccount?.icon}{" "}
                              {transaction.transfer?.fromAccount?.name} →{" "}
                              {transaction.transfer?.toAccount?.icon}{" "}
                              {transaction.transfer?.toAccount?.name} •{" "}
                              {new Date(transaction.date).toLocaleDateString("pt-BR")}
                            </>
                          ) : (
                            <>
                              {transaction.account?.name && (
                                <span>{transaction.account.icon} {transaction.account.name} • </span>
                              )}
                              {new Date(transaction.date).toLocaleDateString("pt-BR")}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          transaction.type === "income"
                            ? theme === "dark"
                              ? "text-emerald-400"
                              : theme === "bw"
                              ? "text-slate-900"
                              : "text-emerald-600"
                            : transaction.type === "transfer"
                            ? theme === "dark"
                              ? "text-blue-400"
                              : theme === "bw"
                              ? "text-slate-900"
                              : "text-blue-600"
                            : theme === "dark"
                              ? "text-pink-400"
                              : theme === "bw"
                              ? "text-slate-900"
                              : "text-pink-600"
                        }`}
                      >
                        {transaction.type === "transfer"
                          ? "↔"
                          : transaction.type === "income"
                          ? "+"
                          : "-"}{" "}
                        R${" "}
                        {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      {transaction.description && <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{transaction.description}</p>}
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
