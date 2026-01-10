"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function InvitePage() {
  const router = useRouter()
  const mode = useAppStore((state) => state.mode)

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  // If solo mode, redirect immediately to /app
  useEffect(() => {
    if (mode === 'solo') {
      handleFinishSetup()
    }
  }, [mode])

  const handleFinishSetup = async () => {
    try {
      // Mark setup as complete
      const res = await fetch('/api/profiles/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup: true })
      })

      if (!res.ok) {
        console.error('Failed to mark setup complete')
      }

      router.push('/app')
    } catch (error) {
      console.error('Error finishing setup:', error)
      router.push('/app')
    }
  }

  const handleSendInvite = async () => {
    if (!email || !email.trim()) {
      toast.error('Digite o email do seu parceiro(a)')
      return
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Email inválido')
      return
    }

    try {
      setLoading(true)

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar convite')
      }

      toast.success('Convite enviado com sucesso!')

      // Mark setup as complete and redirect
      await handleFinishSetup()

    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar convite')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    await handleFinishSetup()
  }

  // Don't render form if solo mode (will redirect)
  if (mode === 'solo') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center">
        <p className="text-slate-600">Redirecionando...</p>
      </div>
    )
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
              <div className="h-1 w-1/4 bg-blue-400 rounded-full" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Convide seu Parceiro(a)</h1>
            <p className="text-slate-600">
              Envie um convite para seu parceiro(a) começar a gerenciar as finanças juntos
            </p>
          </div>

          <GlassCard className="p-6 mb-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="partnerEmail">Email do Parceiro(a)</Label>
                <Input
                  id="partnerEmail"
                  type="email"
                  placeholder="parceiro@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl mt-2"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Enviaremos um email com o link de convite
                </p>
              </div>

              <Button
                onClick={handleSendInvite}
                disabled={loading || !email}
                className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700"
              >
                {loading ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </div>
          </GlassCard>

          <div className="text-center">
            <Button
              onClick={handleSkip}
              variant="ghost"
              disabled={loading}
              className="text-slate-600 hover:text-slate-800"
            >
              Pular por enquanto
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
