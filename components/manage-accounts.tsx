"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"

type Account = {
  id: string
  name: string
  type: string
  icon: string
  current_balance: number
  initial_balance: number
  is_migration_account: boolean
}

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Corrente', icon: '🏦' },
  { value: 'savings', label: 'Poupança', icon: '💰' },
  { value: 'investment', label: 'Investimento', icon: '📈' },
  { value: 'cash', label: 'Dinheiro', icon: '💵' },
  { value: 'other', label: 'Outro', icon: '💳' },
]

export function ManageAccounts() {
  const theme = useAppStore((state) => state.theme)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [balance, setBalance] = useState('')

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/accounts')
      const data = await res.json()
      if (res.ok && data.accounts) setAccounts(data.accounts)
    } catch (error) {
      toast.error('Erro ao carregar contas')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error('Digite um nome')

    try {
      const url = editing ? '/api/accounts' : '/api/accounts'
      const method = editing ? 'PUT' : 'POST'

      const body = editing
        ? { id: editing.id, name, type, current_balance: Number(balance) }
        : { name, type, initial_balance: Number(balance) || 0 }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error((await res.json()).error)

      toast.success(editing ? 'Conta atualizada!' : 'Conta criada!')
      setShowForm(false)
      setEditing(null)
      setName('')
      setBalance('')
      fetchAccounts()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
          Minhas Contas
        </h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          variant="outline"
          className="h-9 rounded-xl text-sm"
        >
          {showForm ? 'Cancelar' : '+ Nova'}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassCard className="p-4 mb-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Tipo</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {ACCOUNT_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setType(t.value)}
                        className={`p-2 rounded-xl text-xs ${
                          type === t.value ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-slate-100'
                        }`}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">{editing ? 'Saldo Atual' : 'Saldo Inicial'}</Label>
                  <Input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="h-10 rounded-xl mt-1"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full h-10 rounded-xl">
                  {editing ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <p className="text-center text-slate-500 py-4">Carregando...</p>
      ) : accounts.length === 0 ? (
        <p className="text-center text-slate-500 py-4">Nenhuma conta cadastrada</p>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <GlassCard key={account.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{account.icon}</span>
                  <div>
                    <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                      {account.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ACCOUNT_TYPES.find(t => t.value === account.type)?.label}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    account.current_balance >= 0 ? "text-emerald-600" : "text-pink-600"
                  }`}>
                    R$ {account.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => {
                      setEditing(account)
                      setName(account.name)
                      setType(account.type)
                      setBalance(account.current_balance.toString())
                      setShowForm(true)
                    }}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Editar
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
