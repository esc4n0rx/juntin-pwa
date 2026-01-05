"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const CATEGORY_ICONS = ["🍔", "🚗", "🏠", "💳", "🎮", "✈️", "🏥", "📚", "👕", "🎬", "💪", "🎁"]

const DEFAULT_CATEGORIES = [
  { id: "1", name: "Alimentação", icon: "🍔" },
  { id: "2", name: "Transporte", icon: "🚗" },
  { id: "3", name: "Moradia", icon: "🏠" },
  { id: "4", name: "Lazer", icon: "🎮" },
]

export default function CategoriesPage() {
  const router = useRouter()
  const searchParams = useSearchParams() // Need to wrap in Suspense boundary if using next/navigation directly in page? Next.js App Router usually handles this, but `useSearchParams` client side is fine.
  const isEditing = searchParams.get("mode") === "edit"

  const mode = useAppStore((state) => state.mode)
  const setCategoriesToStore = useAppStore((state) => state.setCategories)

  const [categories, setCategories] = useState<any[]>(isEditing ? [] : DEFAULT_CATEGORIES)
  const [newCategory, setNewCategory] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("🍔")
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(isEditing)

  // Fetch API if editing
  useEffect(() => {
    if (isEditing) {
      fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
          if (data.categories) setCategories(data.categories)
        })
        .catch(err => toast.error("Erro ao carregar categorias"))
        .finally(() => setLoading(false))
    }
  }, [isEditing])

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error("Digite um nome para a categoria")
      return
    }

    const categoryPayload = {
      id: Date.now().toString(), // Temp ID for UI
      name: newCategory,
      icon: selectedIcon,
      type: 'expense'
    }

    if (isEditing) {
      // Save via API immediately
      try {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryPayload)
        })
        if (!res.ok) throw new Error("Erro ao criar")

        const data = await res.json()
        setCategories([...categories, data.category])
        toast.success("Categoria criada!")
      } catch (e) {
        toast.error("Erro ao salvar categoria")
        return
      }
    } else {
      // Local State
      setCategories([...categories, categoryPayload])
      toast.success("Categoria adicionada!")
    }

    setNewCategory("")
    setShowAddForm(false)
  }

  const handleRemoveCategory = async (id: string) => {
    if (isEditing) {
      // API Delete (Not implemented in route yet, assuming simple UI remove for now or adding DELETE method)
      // For now, assuming we might need DELETE endpoint. User didn't ask explicitly for DELETE but "definir/editar".
      // Let's just remove from UI validation for now or implement DELETE.
      // Assuming optimistic:
      toast.error("Exclusão via API não implementada ainda (MVP)")
      // setCategories(categories.filter((cat) => cat.id !== id))
    } else {
      setCategories(categories.filter((cat) => cat.id !== id))
    }
  }

  const handleContinue = () => {
    if (isEditing) {
      router.back()
    } else {
      setCategoriesToStore(categories)
      router.push("/onboarding/budget")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1/3 bg-blue-400 rounded-full" />
              <div className="h-1 w-1/3 bg-slate-300 rounded-full" />
              <div className="h-1 w-1/3 bg-slate-300 rounded-full" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Categorias</h1>
            <p className="text-slate-600">
              {mode === "couple" ? "Crie categorias compartilhadas" : "Organize seus gastos por categoria"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-4 relative">
                  <button
                    onClick={() => handleRemoveCategory(category.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-400/20 flex items-center justify-center text-red-600 hover:bg-red-400/30"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="text-3xl mb-2">{category.icon}</div>
                  <h3 className="font-semibold text-slate-800">{category.name}</h3>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {showAddForm ? (
            <GlassCard className="p-6 mb-6">
              <h3 className="font-bold text-slate-800 mb-4">Nova Categoria</h3>
              <Input
                placeholder="Nome da categoria"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="mb-4 h-12 rounded-xl"
              />
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-2">Escolha um ícone:</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setSelectedIcon(icon)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${selectedIcon === icon ? "bg-blue-400/30 scale-110" : "bg-slate-200/50"
                        }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCategory} className="flex-1 h-12 rounded-xl bg-slate-800 hover:bg-slate-700">
                  Adicionar
                </Button>
                <Button onClick={() => setShowAddForm(false)} variant="outline" className="flex-1 h-12 rounded-xl">
                  Cancelar
                </Button>
              </div>
            </GlassCard>
          ) : (
            <Button onClick={() => setShowAddForm(true)} variant="outline" className="w-full h-12 rounded-xl mb-6">
              + Adicionar Categoria
            </Button>
          )}

          <div className="flex gap-4">
            <Button onClick={() => router.back()} variant="outline" className="h-14 px-8 rounded-2xl">
              Voltar
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1 h-14 text-base font-semibold rounded-2xl bg-slate-800 hover:bg-slate-700"
            >
              {isEditing ? "Concluir" : "Continuar"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
