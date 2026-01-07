"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type Category = {
  id: string
  name: string
  icon: string
  budget?: number
}

export type Transaction = {
  id: string
  type: "income" | "expense"
  category: string
  amount: number
  date: string
  description?: string
}

export type Goal = {
  id: string
  name: string
  target: number
  current: number
  icon: string
}

export type User = {
  name: string
  email: string
  avatar?: string
}

export type AIInsights = {
  analises: string[]
  dicas: string[]
}

type AppState = {
  // User & Auth
  user: User | null
  mode: "solo" | "couple" | null
  partnerEmail: string | null
  partnerAvatar?: string | null
  isAuthenticated: boolean
  theme: "light" | "dark" | "bw"

  // Financial Data
  categories: Category[]
  transactions: Transaction[]
  goals: Goal[]
  income: number
  incomeFrequency: string

  // AI Insights
  aiInsights: AIInsights | null

  // Actions
  setUser: (user: User) => void
  setMode: (mode: "solo" | "couple") => void
  setPartnerEmail: (email: string) => void
  updateUserAvatar: (avatar: string) => void
  setPartnerAvatar: (avatar: string) => void
  setAuthenticated: (value: boolean) => void
  setTheme: (theme: "light" | "dark" | "bw") => void
  setCategories: (categories: Category[]) => void
  addCategory: (category: Category) => void
  updateCategory: (id: string, updates: Partial<Category>) => void
  deleteCategory: (id: string) => void
  addTransaction: (transaction: Transaction) => void
  setIncome: (income: number, frequency: string) => void
  addGoal: (goal: Goal) => void
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  setAIInsights: (insights: AIInsights | null) => void
  reset: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      mode: null,
      partnerEmail: null,
      partnerAvatar: null,
      isAuthenticated: false,
      theme: "light",
      categories: [],
      transactions: [],
      goals: [],
      income: 0,
      incomeFrequency: "monthly",
      aiInsights: null,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setMode: (mode) => set({ mode }),
      setPartnerEmail: (email) => set({ partnerEmail: email }),
      updateUserAvatar: (avatar) => set((state) => ({ user: state.user ? { ...state.user, avatar } : null })),
      setPartnerAvatar: (avatar) => set({ partnerAvatar: avatar }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setTheme: (theme) => set({ theme }),
      setCategories: (categories) => set({ categories }),
      addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat)),
        })),
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
        })),
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        })),
      setIncome: (income, frequency) => set({ income, incomeFrequency: frequency }),
      addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
      updateGoal: (id, updates) =>
        set((state) => ({
          goals: state.goals.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)),
        })),
      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((goal) => goal.id !== id),
        })),
      setAIInsights: (insights) => set({ aiInsights: insights }),
      reset: () =>
        set({
          user: null,
          mode: null,
          partnerEmail: null,
          partnerAvatar: null,
          isAuthenticated: false,
          categories: [],
          transactions: [],
          goals: [],
          income: 0,
          aiInsights: null,
        }),
    }),
    {
      name: "juntin-storage",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return window.localStorage
        }
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        }
      }),
    },
  ),
)
