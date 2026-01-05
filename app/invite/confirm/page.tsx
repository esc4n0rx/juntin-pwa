"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { acceptInvite } from "@/lib/api/invites"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

function InviteConfirmContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauth'>('loading')
    const [errorMessage, setErrorMessage] = useState("")

    useEffect(() => {
        if (!token) {
            setStatus('error')
            setErrorMessage("Token inválido")
            return
        }

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setStatus('unauth')
                return
            }

            try {
                const result = await acceptInvite(token)
                if (result.error) {
                    throw result.error
                }
                setStatus('success')
                setTimeout(() => router.push("/app"), 2000)
            } catch (err: any) {
                setStatus('error')
                setErrorMessage(err.message || "Erro ao aceitar convite")
            }
        }

        init()
    }, [token, router])

    const handleLoginRedirect = () => {
        router.push(`/login?next=/invite/confirm?token=${token}`)
    }

    const handleRegisterRedirect = () => {
        router.push(`/register?next=/invite/confirm?token=${token}`)
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center p-6">
            <GlassCard className="max-w-md w-full p-8 text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mb-4" />
                        <p>Verificando convite...</p>
                    </div>
                )}

                {status === 'unauth' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Você foi convidado!</h2>
                        <p className="mb-6 text-slate-600">Para aceitar o convite, faça login ou crie uma conta.</p>
                        <div className="space-y-3">
                            <Button onClick={handleLoginRedirect} className="w-full h-12 rounded-xl bg-slate-800">Entrar</Button>
                            <Button onClick={handleRegisterRedirect} variant="outline" className="w-full h-12 rounded-xl">Criar Conta</Button>
                        </div>
                        <p className="mt-4 text-xs text-slate-500">Após entrar, clique no link do email novamente se não for redirecionado.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div>
                        <h2 className="text-2xl font-bold text-green-600 mb-2">Convite Aceito!</h2>
                        <p className="text-slate-600">Redirecionando para o app...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <h2 className="text-2xl font-bold text-red-500 mb-2">Erro</h2>
                        <p className="text-slate-600 mb-6">{errorMessage}</p>
                        <Button onClick={() => router.push("/")} variant="outline">Voltar ao Início</Button>
                    </div>
                )}
            </GlassCard>
        </div>
    )
}

export default function InviteConfirmPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center p-6">
                <GlassCard className="max-w-md w-full p-8 text-center mb-4">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto" />
                </GlassCard>
            </div>
        }>
            <InviteConfirmContent />
        </Suspense>
    )
}
