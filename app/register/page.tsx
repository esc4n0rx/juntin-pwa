"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/glass-card"
import { signUp } from "@/lib/api/auth"
import { checkPendingInvite } from "@/lib/api/invites"
import { createClient } from "@/lib/supabase/client"

// Ensure client component doesn't break
const supabase = createClient()

export default function RegisterPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({ name: "", email: "", password: "" })
    const [error, setError] = useState<string | null>(null)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Erro ao criar conta")
            }

            if (data.success && data.redirect) {
                router.push(data.redirect)
            } else {
                router.push("/select-mode")
            }

        } catch (err: any) {
            setError(err.message || "Erro ao criar conta")
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
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Crie sua conta</h2>
                        <p className="text-slate-600">Comece a organizar sua vida financeira</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome completo</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Seu nome"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

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
                                minLength={6}
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
                                "Criar conta"
                            )}
                        </Button>
                    </form>

                    <p className="text-sm text-slate-600 text-center mt-6">
                        Já tem uma conta? <a href="/login" className="font-semibold text-slate-800 hover:underline">Faça login</a>
                    </p>
                </GlassCard>
            </motion.div>
        </div>
    )
}
