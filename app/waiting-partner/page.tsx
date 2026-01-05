"use client"

import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function WaitingPartnerPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center p-6">
            <GlassCard className="max-w-md w-full p-8 text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-4xl animate-pulse">
                        ⏳
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-4">Aguardando seu parceiro</h2>
                <p className="text-slate-600 mb-8">
                    Seu parceiro(a) ainda não finalizou as configurações iniciais do casal.
                    Assim que ele(a) concluir, você poderá acessar o app.
                </p>

                <Button
                    onClick={() => window.location.reload()}
                    className="w-full h-12 rounded-xl bg-slate-800"
                >
                    Verificar novamente
                </Button>

                <button
                    onClick={() => router.push('/login')}
                    className="mt-4 text-sm text-slate-500 hover:underline"
                >
                    Sair
                </button>
            </GlassCard>
        </div>
    )
}
