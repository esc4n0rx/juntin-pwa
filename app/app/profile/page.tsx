"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Camera, UserCircle2, Mail } from "lucide-react"
import { useRef, useEffect, useState } from "react"
import Image from "next/image"
import { CategoryManagerModal } from "@/components/category-manager-modal"

export default function ProfilePage() {
  const router = useRouter()
  const user = useAppStore((state) => state.user)
  const mode = useAppStore((state) => state.mode)
  const partnerEmail = useAppStore((state) => state.partnerEmail)
  const partnerAvatar = useAppStore((state) => state.partnerAvatar)
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  const categories = useAppStore((state) => state.categories)
  const income = useAppStore((state) => state.income)
  const incomeFrequency = useAppStore((state) => state.incomeFrequency)
  const updateUserAvatar = useAppStore((state) => state.updateUserAvatar)
  const setPartnerAvatar = useAppStore((state) => state.setPartnerAvatar)
  const setUser = useAppStore((state) => state.setUser)
  const setMode = useAppStore((state) => state.setMode)
  const setPartnerEmail = useAppStore((state) => state.setPartnerEmail)
  const reset = useAppStore((state) => state.reset)

  const userFileInputRef = useRef<HTMLInputElement>(null)
  const partnerFileInputRef = useRef<HTMLInputElement>(null)
  const [pendingInvite, setPendingInvite] = useState<{ email: string; sentAt: string } | null>(null)
  const [resendingInvite, setResendingInvite] = useState(false)

  // Função para buscar dados atualizados
  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (response.ok && data.user) {
        // Atualizar dados do usuário
        if (data.user.mode) {
          setMode(data.user.mode)
        }
        if (data.user.name && data.user.email) {
          setUser({
            name: data.user.name,
            email: data.user.email,
            avatar: data.user.avatar
          })
        }
        // Atualizar dados do parceiro
        if (data.user.partner) {
          setPartnerEmail(data.user.partner.email)
          if (data.user.partner.avatar) {
            setPartnerAvatar(data.user.partner.avatar)
          }
        }
        // Atualizar convite pendente
        if (data.user.pendingInvite) {
          setPendingInvite(data.user.pendingInvite)
        } else {
          setPendingInvite(null)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error)
    }
  }

  // Buscar dados ao carregar e manter sincronizado
  useEffect(() => {
    fetchUserData()

    // Recarregar dados a cada 5 segundos para manter sincronizado com parceiro
    const interval = setInterval(fetchUserData, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleUserAvatarClick = () => {
    userFileInputRef.current?.click()
  }

  const handleUserAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande! Máximo 5MB")
        return
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        toast.error("Arquivo deve ser uma imagem")
        return
      }

      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          toast.loading("Fazendo upload da foto...")

          const response = await fetch('/api/upload/avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: reader.result as string
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer upload')
          }

          updateUserAvatar(data.avatar_url)
          toast.dismiss()
          toast.success("Foto atualizada com sucesso!")

          // Recarregar dados para sincronizar
          await fetchUserData()
        } catch (error: any) {
          toast.dismiss()
          console.error('Erro ao fazer upload:', error)
          toast.error(error.message || 'Erro ao atualizar foto')
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePartnerAvatarClick = () => {
    partnerFileInputRef.current?.click()
  }

  const handlePartnerAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande! Máximo 5MB")
        return
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        toast.error("Arquivo deve ser uma imagem")
        return
      }

      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          toast.loading("Fazendo upload da foto do parceiro(a)...")

          const response = await fetch('/api/upload/partner-avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: reader.result as string
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer upload')
          }

          setPartnerAvatar(data.avatar_url)
          toast.dismiss()
          toast.success("Foto do parceiro(a) atualizada!")

          // Recarregar dados para sincronizar
          await fetchUserData()
        } catch (error: any) {
          toast.dismiss()
          console.error('Erro ao fazer upload:', error)
          toast.error(error.message || 'Erro ao atualizar foto do parceiro(a)')
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair?")) {
      try {
        // Call logout API to clear cookies
        await fetch('/api/auth/logout', { method: 'POST' })

        // Reset store
        reset()
        toast.success("Até logo!")
        router.push("/login")
      } catch (error) {
        console.error('Erro ao fazer logout:', error)
        // Even if API fails, still clear local state
        reset()
        router.push("/login")
      }
    }
  }

  const handleDeleteAccount = () => {
    if (confirm("Tem certeza que deseja encerrar sua conta? Esta ação não pode ser desfeita.")) {
      reset()
      toast.success("Conta encerrada com sucesso")
      router.push("/")
    }
  }

  const handleResendInvite = async () => {
    if (!pendingInvite) return

    setResendingInvite(true)
    try {
      const response = await fetch('/api/invite/resend', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao reenviar convite')
      }

      toast.success(`Convite reenviado para ${data.email}!`)
      await fetchUserData() // Atualizar dados
    } catch (error: any) {
      console.error('Erro ao reenviar convite:', error)
      toast.error(error.message || 'Erro ao reenviar convite')
    } finally {
      setResendingInvite(false)
    }
  }

  const frequencyLabels: Record<string, string> = {
    monthly: "Mensal",
    biweekly: "Quinzenal",
    weekly: "Semanal",
  }

  return (
    <div className={`p-6 pb-8 min-h-screen ${theme === "dark" ? "bg-slate-900" : ""}`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className={`text-3xl font-bold mb-6 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Perfil</h1>

        <GlassCard className="p-6 mb-6">
          {mode === "couple" ? (
            // Layout para casal - duas fotos lado a lado
            <div className="mb-6">
              <div className="flex items-center justify-center gap-4 mb-4">
                {/* Foto do usuário */}
                <div className="relative group">
                  <button
                    onClick={handleUserAvatarClick}
                    className="relative w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-3xl text-white font-black transition-all hover:scale-105"
                  >
                    {user?.avatar ? (
                      <Image src={user.avatar || "/placeholder.svg"} alt={user.name} fill className="object-cover" />
                    ) : (
                      user?.name?.charAt(0) || "U"
                    )}
                  </button>
                  <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <Camera className="w-4 h-4 text-slate-600" />
                  </div>
                  <input
                    ref={userFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUserAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* Ícone de coração entre as fotos */}
                <div className="text-2xl">❤️</div>

                {/* Foto do parceiro */}
                <div className="relative group">
                  <button
                    onClick={handlePartnerAvatarClick}
                    className="relative w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-3xl text-white font-black transition-all hover:scale-105"
                  >
                    {partnerAvatar ? (
                      <Image
                        src={partnerAvatar || "/placeholder.svg"}
                        alt="Parceiro(a)"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <UserCircle2 className="w-12 h-12" />
                    )}
                  </button>
                  <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <Camera className="w-4 h-4 text-slate-600" />
                  </div>
                  <input
                    ref={partnerFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePartnerAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>
              <div className="text-center">
                <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{user?.name}</h2>
                <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>{user?.email}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="text-pink-600 text-sm">💑</span>
                  <span className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Modo Casal</span>
                </div>
              </div>
            </div>
          ) : (
            // Layout para solo - uma foto centralizada
            <div className="flex flex-col items-center mb-6">
              <div className="relative group mb-4">
                <button
                  onClick={handleUserAvatarClick}
                  className="relative w-28 h-28 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-4xl text-white font-black transition-all hover:scale-105"
                >
                  {user?.avatar ? (
                    <Image src={user.avatar || "/placeholder.svg"} alt={user.name} fill className="object-cover" />
                  ) : (
                    user?.name?.charAt(0) || "U"
                  )}
                </button>
                <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-slate-600" />
                </div>
                <input
                  ref={userFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUserAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="text-center">
                <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{user?.name}</h2>
                <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>{user?.email}</p>
              </div>
            </div>
          )}

          {mode === "couple" && partnerEmail && (
            <div className={`p-3 rounded-xl ${
              theme === "dark" ? "bg-slate-700/50" : theme === "bw" ? "bg-slate-100" : "bg-pink-50"
            }`}>
              <p className={`text-xs mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Parceiro(a) convidado:</p>
              <p className={`text-sm font-medium ${
                theme === "dark" ? "text-pink-400" : theme === "bw" ? "text-slate-800" : "text-pink-700"
              }`}>
                {partnerEmail}
              </p>
            </div>
          )}
        </GlassCard>

        {mode === "couple" && pendingInvite && !partnerAvatar && (
          <GlassCard className="p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-full ${
                theme === "dark" ? "bg-yellow-900/50" : theme === "bw" ? "bg-slate-100" : "bg-yellow-50"
              }`}>
                <Mail className={`w-5 h-5 ${
                  theme === "dark" ? "text-yellow-400" : theme === "bw" ? "text-slate-600" : "text-yellow-600"
                }`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-bold mb-1 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Convite Pendente</h3>
                <p className={`text-sm mb-3 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  O convite foi enviado para <span className="font-medium">{pendingInvite.email}</span> mas ainda não foi aceito.
                </p>
                <Button
                  onClick={handleResendInvite}
                  disabled={resendingInvite}
                  className={`w-full h-10 rounded-xl ${
                    theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : theme === "bw" ? "bg-slate-800 hover:bg-slate-700" : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {resendingInvite ? "Reenviando..." : "Reenviar Convite"}
                </Button>
              </div>
            </div>
          </GlassCard>
        )}

        <GlassCard className="p-6 mb-6">
          <h3 className={`font-bold mb-4 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Aparência</h3>

          <div className="space-y-3">
            <button
              onClick={() => setTheme("light")}
              className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                theme === "light"
                  ? "bg-blue-500 text-white shadow-lg"
                  : theme === "dark"
                  ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  theme === "light" ? "bg-white/20" : theme === "dark" ? "bg-slate-600" : "bg-white"
                }`}>
                  ☀️
                </div>
                <div className="text-left">
                  <p className="font-semibold">Modo Claro</p>
                  <p className={`text-xs ${theme === "light" ? "text-blue-100" : theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    Visual colorido e vibrante
                  </p>
                </div>
              </div>
              {theme === "light" && <span className="text-xl">✓</span>}
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                theme === "dark"
                  ? "bg-slate-700 text-white shadow-lg border-2 border-slate-600"
                  : theme === "light"
                  ? "bg-white text-slate-700 hover:bg-slate-50"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  theme === "dark" ? "bg-slate-600" : "bg-slate-200"
                }`}>
                  🌙
                </div>
                <div className="text-left">
                  <p className="font-semibold">Modo Escuro</p>
                  <p className={`text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-500"}`}>
                    Ideal para ambientes com pouca luz
                  </p>
                </div>
              </div>
              {theme === "dark" && <span className="text-xl">✓</span>}
            </button>

            <button
              onClick={() => setTheme("bw")}
              className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                theme === "bw"
                  ? "bg-slate-800 text-white shadow-lg"
                  : theme === "dark"
                  ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  theme === "bw" ? "bg-slate-700" : theme === "dark" ? "bg-slate-600" : "bg-slate-200"
                }`}>
                  ⚫
                </div>
                <div className="text-left">
                  <p className="font-semibold">Preto & Branco</p>
                  <p className={`text-xs ${theme === "bw" ? "text-slate-300" : theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    Sem cores, apenas tons de cinza
                  </p>
                </div>
              </div>
              {theme === "bw" && <span className="text-xl">✓</span>}
            </button>
          </div>
        </GlassCard>


        <GlassCard className="p-6 mb-6">
          <h3 className={`font-bold mb-4 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Dados Financeiros</h3>

          <div className="space-y-4">
            <div className={`flex items-center justify-between py-3 border-b ${theme === "dark" ? "border-slate-700/50" : "border-slate-200/50"}`}>
              <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Renda</span>
              <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                R$ {income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className={`flex items-center justify-between py-3 border-b ${theme === "dark" ? "border-slate-700/50" : "border-slate-200/50"}`}>
              <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Frequência</span>
              <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                {frequencyLabels[incomeFrequency] || incomeFrequency}
              </span>
            </div>
            {/* Real Category Count from API will be implemented in future refactor of store or direct fetch here.
                For MVP, `categories` store might be stale if we don't sync.
                Ideally, Profile should fetch from /api/categories.
            */}
            <div className="flex items-center justify-between py-3">
              <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Categorias</span>
              <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                {/* For now showing static or store length, verifying API later */}
                {categories.length > 0 ? categories.length : "Padrão"}
              </span>
            </div>
          </div>

          <CategoryManagerModal>
            <Button
              variant="outline"
              className="w-full mt-4 h-11 rounded-xl"
            >
              Gerenciar Categorias
            </Button>
          </CategoryManagerModal>
        </GlassCard>

        <GlassCard className="p-6 mb-6">
          <h3 className={`font-bold mb-2 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Sobre o JUNTIN</h3>
          <p className={`text-sm mb-3 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
            Aplicativo de controle financeiro individual ou em casal. Versão 1.0.0
          </p>
          <div className={`flex items-center gap-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            <span>Desenvolvido com</span>
            <span className="text-pink-500">❤️</span>
            <span>por v0</span>
          </div>
        </GlassCard>

        <div className="space-y-3">
          <Button onClick={handleLogout} variant="outline" className="w-full h-12 rounded-xl bg-transparent">
            Sair da Conta
          </Button>

          <Button onClick={handleDeleteAccount} variant="destructive" className="w-full h-12 rounded-xl">
            Encerrar Conta
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
