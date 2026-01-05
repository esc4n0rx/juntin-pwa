"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/glass-card"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erro ao entrar")
      }

      // API returns a redirect path (e.g. /app or /select-mode)
      if (data.redirect) {
        router.push(data.redirect)
      } else {
        router.push("/app") // Fallback
      }

    } catch (err: any) {
      setError(err.message || "Erro ao entrar")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <h1
            className="text-6xl font-black text-slate-800 mb-3"
            style={{ fontFamily: "SF Pro Display, Inter, sans-serif" }}
          >
            Juntin
          </h1>
          <p className="text-slate-600">Controle de Finanças a Dois</p>
        </div>

        <GlassCard className="p-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo!</h2>
            <p className="text-slate-600">Entre para começar a gerenciar suas finanças</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 text-base font-semibold rounded-2xl bg-slate-800 hover:bg-slate-700"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <p className="text-sm text-slate-600 text-center mt-6">
            Não tem uma conta? <a href="/register" className="font-semibold text-slate-800 hover:underline">Cadastre-se</a>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  )
}
