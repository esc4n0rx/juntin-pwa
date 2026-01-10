"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente', icon: '🏦' },
  { value: 'savings', label: 'Poupança', icon: '💰' },
  { value: 'investment', label: 'Investimento', icon: '📈' },
  { value: 'cash', label: 'Dinheiro', icon: '💵' },
  { value: 'other', label: 'Outro', icon: '💳' },
]

export default function AccountsPage() {
  const router = useRouter()
  const mode = useAppStore((state) => state.mode)

  const [accounts, setAccounts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [balance, setBalance] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddAccount = () => {
    if (!name.trim()) {
      toast.error('Digite um nome para a conta')
      return
    }
    if (!balance || Number(balance) < 0) {
      toast.error('Digite o saldo inicial')
      return
    }

    const newAccount = {
      id: Date.now().toString(),
      name: name.trim(),
      type,
      initial_balance: Number(balance),
      icon: ACCOUNT_TYPES.find(t => t.value === type)?.icon || '💳'
    }

    setAccounts([...accounts, newAccount])
    setName('')
    setBalance('')
    setShowForm(false)
    toast.success('Conta adicionada!')
  }

  const handleRemoveAccount = (id: string) => {
    setAccounts(accounts.filter(a => a.id !== id))
  }

  const handleContinue = async () => {
    if (accounts.length === 0) {
      toast.error('Adicione pelo menos uma conta')
      return
    }

    try {
      setLoading(true)

      // Criar todas as contas
      for (const account of accounts) {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: account.name,
            type: account.type,
            initial_balance: account.initial_balance,
            icon: account.icon,
          })
        })

        if (!res.ok) {
          throw new Error('Erro ao criar conta')
        }
      }

      toast.success('Contas criadas!')

      // Redirecionar baseado no modo
      if (mode === 'couple') {
        router.push('/onboarding/invite')
      } else {
        router.push('/app')
      }

    } catch (error) {
      toast.error('Erro ao criar contas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1/4 bg-blue-400 rounded-full" />
              <div className="h-1 w-1/4 bg-blue-400 rounded-full" />
              <div className="h-1 w-1/4 bg-blue-400 rounded-full" />
              <div className="h-1 w-1/4 bg-slate-300 rounded-full" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Suas Contas</h1>
            <p className="text-slate-600">
              {mode === "couple" ? "Adicione as contas que vocês usam" : "Adicione suas contas bancárias"}
            </p>
          </div>

          {accounts.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {accounts.map((account) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <GlassCard className="p-4 relative">
                    <button
                      onClick={() => handleRemoveAccount(account.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-400/20 flex items-center justify-center text-red-600 hover:bg-red-400/30"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="text-3xl mb-2">{account.icon}</div>
                    <h3 className="font-semibold text-slate-800">{account.name}</h3>
                    <p className="text-sm text-slate-600">
                      R$ {Number(account.initial_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}

          {showForm ? (
            <GlassCard className="p-6 mb-6">
              <h3 className="font-bold text-slate-800 mb-4">Nova Conta</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="accountName">Nome da Conta</Label>
                  <Input
                    id="accountName"
                    placeholder="Ex: Nubank, Conta Corrente"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-xl mt-2"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Tipo de Conta</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCOUNT_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setType(t.value)}
                        className={`p-3 rounded-xl transition-all ${
                          type === t.value
                            ? 'bg-blue-100 ring-2 ring-blue-400'
                            : 'bg-slate-200/50'
                        }`}
                      >
                        <div className="text-2xl mb-1">{t.icon}</div>
                        <p className="text-xs font-medium">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="balance">Saldo Inicial</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="h-12 rounded-xl text-lg mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">Quanto você tem nesta conta hoje</p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddAccount} className="flex-1 h-12 rounded-xl bg-slate-800">
                    Adicionar
                  </Button>
                  <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 h-12 rounded-xl">
                    Cancelar
                  </Button>
                </div>
              </div>
            </GlassCard>
          ) : (
            <Button onClick={() => setShowForm(true)} variant="outline" className="w-full h-12 rounded-xl mb-6">
              + Adicionar Conta
            </Button>
          )}

          <div className="flex gap-4">
            <Button onClick={() => router.back()} variant="outline" className="h-14 px-8 rounded-2xl">
              Voltar
            </Button>
            <Button
              onClick={handleContinue}
              disabled={loading || accounts.length === 0}
              className="flex-1 h-14 text-base font-semibold rounded-2xl bg-slate-800"
            >
              {loading ? 'Salvando...' : 'Continuar'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
