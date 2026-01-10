"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"

type MigrationModalProps = {
  isOpen: boolean
  onClose: () => void
  onMigrationComplete: () => void
}

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente', icon: '🏦' },
  { value: 'savings', label: 'Poupança', icon: '💰' },
  { value: 'investment', label: 'Investimento', icon: '📈' },
  { value: 'cash', label: 'Dinheiro', icon: '💵' },
  { value: 'other', label: 'Outro', icon: '💳' },
]

export function MigrationModal({ isOpen, onClose, onMigrationComplete }: MigrationModalProps) {
  const theme = useAppStore((state) => state.theme)
  const [step, setStep] = useState<'info' | 'create-account'>('info')
  const [loading, setLoading] = useState(false)

  // Form states
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState('checking')
  const [initialBalance, setInitialBalance] = useState('')
  const [calculatedBalance, setCalculatedBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  const handleViewChangelog = () => {
    setStep('info')
    // Mostrar changelog
  }

  const handleCreateAccount = async () => {
    setStep('create-account')
    // Buscar saldo calculado ao abrir o formulário
    await fetchCalculatedBalance()
  }

  const fetchCalculatedBalance = async () => {
    try {
      setLoadingBalance(true)
      const response = await fetch('/api/accounts/migrate')

      if (response.ok) {
        const data = await response.json()
        if (data.calculated_balance !== undefined) {
          setCalculatedBalance(data.calculated_balance)
          setInitialBalance(data.calculated_balance.toString())
        }
      }
    } catch (error) {
      console.error('Erro ao calcular saldo:', error)
    } finally {
      setLoadingBalance(false)
    }
  }

  const handleSubmitAccount = async () => {
    if (!accountName.trim()) {
      toast.error('Digite um nome para a conta')
      return
    }

    if (initialBalance === '' || Number(initialBalance) < 0) {
      toast.error('Digite o saldo atual da conta')
      return
    }

    try {
      setLoading(true)

      // Executar migração automática primeiro
      const migrationResponse = await fetch('/api/accounts/migrate', {
        method: 'POST'
      })

      if (!migrationResponse.ok) {
        const data = await migrationResponse.json()
        throw new Error(data.error || 'Erro na migração')
      }

      const migrationData = await migrationResponse.json()

      // Atualizar a conta criada automaticamente com as preferências do usuário
      const updateResponse = await fetch('/api/accounts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: migrationData.account.id,
          name: accountName.trim(),
          type: accountType,
          current_balance: Number(initialBalance),
          icon: ACCOUNT_TYPES.find(t => t.value === accountType)?.icon || '💳',
        }),
      })

      if (!updateResponse.ok) {
        const data = await updateResponse.json()
        throw new Error(data.error || 'Erro ao atualizar conta')
      }

      toast.success('Migração realizada com sucesso!')
      onMigrationComplete()
      onClose()

    } catch (error: any) {
      console.error('Erro ao criar conta:', error)
      toast.error(error.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            // Não permitir fechar clicando fora - migração é obrigatória
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md"
        >
          <GlassCard className="p-6">
            {step === 'info' && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🎉</div>
                  <h2 className={`text-2xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                    O JUNTIN foi atualizado!
                  </h2>
                  <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    Agora você pode gerenciar suas contas bancárias e prever seu futuro financeiro.
                  </p>
                </div>

                <div className={`p-4 rounded-xl mb-6 ${
                  theme === "dark" ? "bg-blue-900/30" : theme === "bw" ? "bg-slate-100" : "bg-blue-50"
                }`}>
                  <h3 className={`font-bold mb-2 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                    📌 O que mudou?
                  </h3>
                  <ul className={`space-y-2 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span><strong>Contas bancárias:</strong> Gerencie múltiplas contas (corrente, poupança, investimentos)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span><strong>Contas recorrentes:</strong> Automatize lançamentos mensais (aluguel, Netflix, salário)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span><strong>Futuro financeiro:</strong> Veja projeções e simulações do seu dinheiro</span>
                    </li>
                  </ul>
                </div>

                <div className={`p-4 rounded-xl mb-6 ${
                  theme === "dark" ? "bg-amber-900/30" : theme === "bw" ? "bg-slate-100" : "bg-amber-50"
                }`}>
                  <h3 className={`font-bold mb-2 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                    ⚠️ Ação necessária
                  </h3>
                  <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    Para continuar usando o app, você precisa criar sua primeira conta e informar o saldo atual.
                    Seu histórico será preservado automaticamente.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleViewChangelog}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl"
                  >
                    Ver novidades
                  </Button>
                  <Button
                    onClick={handleCreateAccount}
                    className={`flex-1 h-12 rounded-xl ${
                      theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : theme === "bw" ? "bg-slate-800" : "bg-blue-500"
                    }`}
                  >
                    Criar conta agora
                  </Button>
                </div>
              </>
            )}

            {step === 'create-account' && (
              <>
                <div className="mb-6">
                  <button
                    onClick={() => setStep('info')}
                    className={`flex items-center gap-2 text-sm mb-4 ${
                      theme === "dark" ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Voltar
                  </button>
                  <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                    Criar primeira conta
                  </h2>
                  <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    Informe os dados da sua conta principal
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="accountName" className="mb-2 block">
                      Nome da conta
                    </Label>
                    <Input
                      id="accountName"
                      placeholder="Ex: Nubank, Conta Principal"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Tipo de conta</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ACCOUNT_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setAccountType(type.value)}
                          className={`p-3 rounded-xl transition-all ${
                            accountType === type.value
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
                          <div className="text-2xl mb-1">{type.icon}</div>
                          <p className={`text-xs font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                            {type.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="initialBalance" className="mb-2 block">
                      Saldo atual
                    </Label>
                    {loadingBalance ? (
                      <div className="h-12 rounded-xl flex items-center justify-center bg-slate-200/50 dark:bg-slate-700/50">
                        <span className="text-sm text-slate-500">Calculando...</span>
                      </div>
                    ) : (
                      <>
                        {calculatedBalance !== null && (
                          <div className={`p-3 rounded-xl mb-2 ${
                            theme === "dark" ? "bg-green-900/30" : theme === "bw" ? "bg-slate-100" : "bg-green-50"
                          }`}>
                            <p className={`text-xs mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                              📊 Saldo calculado automaticamente:
                            </p>
                            <p className={`text-lg font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                              R$ {calculatedBalance.toFixed(2)}
                            </p>
                            <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                              Baseado no seu histórico de transações
                            </p>
                          </div>
                        )}
                        <Input
                          id="initialBalance"
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={initialBalance}
                          onChange={(e) => setInitialBalance(e.target.value)}
                          className="h-12 rounded-xl text-lg"
                        />
                        <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                          {calculatedBalance !== null
                            ? "Você pode ajustar o saldo se tiver dinheiro em espécie não contabilizado"
                            : "Informe quanto você tem nesta conta hoje"
                          }
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSubmitAccount}
                  disabled={loading}
                  className={`w-full h-12 rounded-xl ${
                    theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : theme === "bw" ? "bg-slate-800" : "bg-blue-500"
                  }`}
                >
                  {loading ? 'Criando...' : 'Criar conta e continuar'}
                </Button>
              </>
            )}
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
