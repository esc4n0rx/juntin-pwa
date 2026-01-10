"use client"

import { useState } from "react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"

type SimulatorModalProps = {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
  onSimulate: (simulation: SimulationData) => void
}

export type SimulationData = {
  type: 'one-time' | 'recurring'
  description: string
  amount: number
  date: string
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
}

export function SimulatorModal({ isOpen, onClose, currentBalance, onSimulate }: SimulatorModalProps) {
  const theme = useAppStore((state) => state.theme)
  const [simulationType, setSimulationType] = useState<'one-time' | 'recurring'>('one-time')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'>('monthly')

  const handleSimulate = () => {
    if (!description.trim()) {
      toast.error('Digite uma descrição')
      return
    }

    if (!amount || Number(amount) <= 0) {
      toast.error('Digite um valor válido')
      return
    }

    if (!date) {
      toast.error('Escolha uma data')
      return
    }

    const simulation: SimulationData = {
      type: simulationType,
      description: description.trim(),
      amount: Number(amount),
      date,
      ...(simulationType === 'recurring' && { frequency })
    }

    onSimulate(simulation)
  }

  const handleClear = () => {
    setDescription('')
    setAmount('')
    setDate('')
    setFrequency('monthly')
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
            onClose()
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <GlassCard className="p-6">
            <div className="mb-6">
              <button
                onClick={onClose}
                className={`flex items-center gap-2 text-sm mb-4 ${
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fechar
              </button>
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">💡</div>
                <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                  Simulador "E se..."
                </h2>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  Simule cenários sem afetar seus dados reais
                </p>
              </div>

              <div className={`p-3 rounded-xl mb-4 ${
                theme === "dark" ? "bg-blue-900/30" : theme === "bw" ? "bg-slate-100" : "bg-blue-50"
              }`}>
                <p className={`text-xs mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  💰 Seu saldo atual
                </p>
                <p className={`text-lg font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                  R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {/* Tipo de Simulação */}
              <div>
                <Label className="mb-2 block">Tipo de despesa</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSimulationType('one-time')}
                    className={`p-3 rounded-xl transition-all ${
                      simulationType === 'one-time'
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
                    <div className="text-2xl mb-1">💸</div>
                    <p className={`text-xs font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                      Despesa única
                    </p>
                  </button>
                  <button
                    onClick={() => setSimulationType('recurring')}
                    className={`p-3 rounded-xl transition-all ${
                      simulationType === 'recurring'
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
                    <div className="text-2xl mb-1">🔄</div>
                    <p className={`text-xs font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                      Recorrente
                    </p>
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <Label htmlFor="description" className="mb-2 block">
                  Descrição
                </Label>
                <Input
                  id="description"
                  placeholder="Ex: Comprar carro"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Valor */}
              <div>
                <Label htmlFor="amount" className="mb-2 block">
                  Valor
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 rounded-xl text-lg"
                />
              </div>

              {/* Data */}
              <div>
                <Label htmlFor="date" className="mb-2 block">
                  Data {simulationType === 'recurring' ? 'de início' : 'da compra'}
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Frequência (apenas para recorrente) */}
              {simulationType === 'recurring' && (
                <div>
                  <Label className="mb-2 block">Frequência</Label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className={`w-full h-12 rounded-xl px-4 ${
                      theme === "dark"
                        ? "bg-slate-700/50 text-white"
                        : theme === "bw"
                        ? "bg-slate-100 text-slate-900"
                        : "bg-white text-slate-900"
                    } border ${
                      theme === "dark" ? "border-slate-600" : "border-slate-300"
                    }`}
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleClear}
                variant="outline"
                className="flex-1 h-12 rounded-xl"
              >
                Limpar
              </Button>
              <Button
                onClick={handleSimulate}
                className={`flex-1 h-12 rounded-xl ${
                  theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : theme === "bw" ? "bg-slate-800" : "bg-blue-500"
                }`}
              >
                Simular
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
