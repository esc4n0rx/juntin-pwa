"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GlassCard } from "@/components/glass-card"
import { toast } from "sonner"
import { Plus, Trash2, X, Pencil, Check } from "lucide-react"

const CATEGORY_ICONS = ["🍔", "🚗", "🏠", "💳", "🎮", "✈️", "🏥", "📚", "👕", "🎬", "💪", "🎁", "🚑", "🐾", "💡", "🎓"]

export function CategoryManagerModal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const categories = useAppStore((state) => state.categories)
    const setCategories = useAppStore((state) => state.setCategories)

    const [newCategory, setNewCategory] = useState("")
    const [selectedIcon, setSelectedIcon] = useState("🍔")
    const [showAddForm, setShowAddForm] = useState(false)
    const [loading, setLoading] = useState(false)

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editIcon, setEditIcon] = useState("")

    // Fetch Categories
    const fetchCategories = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/categories')
            const data = await res.json()
            if (data.categories) setCategories(data.categories)
        } catch (e) {
            toast.error("Erro ao carregar categorias")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            fetchCategories()
        }
    }, [open])

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return

        const payload = {
            name: newCategory,
            icon: selectedIcon,
            type: 'expense'
        }

        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error()

            const data = await res.json()
            setCategories([...categories, data.category])
            toast.success("Categoria criada!")
            setNewCategory("")
            setShowAddForm(false)
            fetchCategories() // Refresh to ensure sync
        } catch (e) {
            toast.error("Erro ao salvar")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza? Isso pode afetar orçamentos.")) return

        try {
            const res = await fetch('/api/categories', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })

            if (!res.ok) throw new Error()

            setCategories(categories.filter(c => c.id !== id))
            toast.success("Categoria removida")
        } catch (e) {
            console.error(e)
            toast.error("Erro ao remover")
        }
    }

    const startEdit = (cat: any) => {
        setEditingId(cat.id)
        setEditName(cat.name)
        setEditIcon(cat.icon)
    }

    const saveEdit = async () => {
        if (!editingId || !editName.trim()) return

        try {
            const res = await fetch('/api/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingId,
                    name: editName,
                    icon: editIcon
                })
            })
            if (!res.ok) throw new Error()

            const data = await res.json()

            // Update local state
            setCategories(categories.map(c => c.id === editingId ? data.category : c))

            setEditingId(null)
            toast.success("Atualizado!")
        } catch (e) {
            toast.error("Erro ao atualizar")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0 gap-0 bg-slate-50 border-none overflow-hidden">
                <div className="p-6 pb-2">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-slate-800">Gerenciar Categorias</DialogTitle>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    {!showAddForm && (
                        <Button
                            onClick={() => setShowAddForm(true)}
                            variant="outline"
                            className="w-full mb-4 border-dashed border-2 h-12"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Categoria
                        </Button>
                    )}

                    {showAddForm && (
                        <GlassCard className="p-4 mb-4 bg-white/50 border-blue-200 border-2">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-semibold text-slate-700">Nova Categoria</h4>
                                <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)} className="h-6 w-6">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <Input
                                placeholder="Nome"
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                className="mb-4 bg-white"
                            />

                            <div className="flex flex-wrap gap-2 mb-4">
                                {CATEGORY_ICONS.map(icon => (
                                    <button
                                        key={icon}
                                        onClick={() => setSelectedIcon(icon)}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${selectedIcon === icon ? "bg-blue-100 ring-2 ring-blue-400" : "bg-white"
                                            }`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>

                            <Button onClick={handleAddCategory} className="w-full bg-slate-800">Salvar</Button>
                        </GlassCard>
                    )}

                    <div className="space-y-3 pb-8">
                        {loading && <p className="text-center text-slate-500">Carregando...</p>}
                        {!loading && categories.map(cat => (
                            <GlassCard key={cat.id} className="p-3 flex items-center gap-3">
                                {editingId === cat.id ? (
                                    // EDIT MODE ROW
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="flex flex-col gap-2 flex-1">
                                            <div className="flex gap-2 mb-1 overflow-x-auto pb-1">
                                                {CATEGORY_ICONS.slice(0, 5).map(icon => (
                                                    <button key={icon} onClick={() => setEditIcon(icon)} className={`p-1 rounded ${editIcon === icon ? 'bg-blue-200' : ''}`}>{icon}</button>
                                                ))}
                                            </div>
                                            <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" />
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600" onClick={saveEdit}>
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // VIEW MODE ROW
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl shrink-0">
                                            {cat.icon}
                                        </div>
                                        <span className="font-medium text-slate-700 flex-1 truncate">{cat.name}</span>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => startEdit(cat)} className="h-8 w-8 text-slate-400 hover:text-blue-500">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="h-8 w-8 text-slate-400 hover:text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
