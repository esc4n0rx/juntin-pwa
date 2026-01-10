import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * API de Projeções Financeiras Futuras
 *
 * Calcula projeção de saldo para os próximos 30 dias considerando:
 * - Saldo atual das contas
 * - Contas recorrentes (quando vão executar)
 * - Alertas quando saldo ficará negativo
 */

type RecurringTransaction = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  day_of_month: number | null
  day_of_week: number | null
  account_id: string
  category?: { name: string; icon: string }
}

function getNextOccurrence(recurring: RecurringTransaction, fromDate: Date): Date | null {
  const result = new Date(fromDate)

  switch (recurring.frequency) {
    case 'daily':
      result.setDate(result.getDate() + 1)
      return result

    case 'weekly':
      const daysUntilNext = (recurring.day_of_week! - result.getDay() + 7) % 7
      result.setDate(result.getDate() + (daysUntilNext || 7))
      return result

    case 'biweekly':
      const daysUntilNextBi = (recurring.day_of_week! - result.getDay() + 7) % 7
      result.setDate(result.getDate() + (daysUntilNextBi || 14))
      return result

    case 'monthly':
      result.setMonth(result.getMonth() + 1)
      const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
      result.setDate(Math.min(recurring.day_of_month || 1, lastDay))
      return result

    case 'yearly':
      result.setFullYear(result.getFullYear() + 1)
      return result

    default:
      return null
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminDb = createAdminClient()

    // Buscar couple_id
    const { data: profile } = await adminDb
      .from('profiles')
      .select('couple_id')
      .eq('id', payload.userId)
      .single()

    if (!profile?.couple_id) {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 })
    }

    // Parâmetros de simulação (opcional)
    const url = new URL(request.url)
    const simulationType = url.searchParams.get('simulationType')
    const simulationDescription = url.searchParams.get('simulationDescription')
    const simulationAmount = url.searchParams.get('simulationAmount')
    const simulationDate = url.searchParams.get('simulationDate')
    const simulationFrequency = url.searchParams.get('simulationFrequency')

    // Buscar saldo atual das contas
    const { data: accounts } = await adminDb
      .from('accounts')
      .select('id, name, current_balance, icon')
      .eq('couple_id', profile.couple_id)
      .eq('is_active', true)

    const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.current_balance), 0) || 0

    // Buscar contas recorrentes ativas
    const { data: recurring } = await adminDb
      .from('recurring_transactions')
      .select(`
        *,
        category:categories(name, icon)
      `)
      .eq('couple_id', profile.couple_id)
      .eq('is_active', true)

    // Gerar projeções para os próximos 30 dias
    const projections: any[] = []
    const alerts: any[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let runningBalance = totalBalance

    // Criar objeto de simulação se fornecido
    let simulation: any = null
    if (simulationType && simulationDescription && simulationAmount && simulationDate) {
      simulation = {
        type: simulationType,
        description: simulationDescription,
        amount: Number(simulationAmount),
        date: simulationDate,
        frequency: simulationFrequency || 'monthly',
        isSimulation: true
      }
    }

    for (let i = 0; i <= 30; i++) {
      const currentDate = new Date(today)
      currentDate.setDate(today.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]

      const dayTransactions: any[] = []

      // Verificar contas recorrentes que ocorrem neste dia
      recurring?.forEach((rec: RecurringTransaction) => {
        const shouldExecute = checkIfShouldExecute(rec, currentDate)
        if (shouldExecute) {
          const amount = rec.type === 'income' ? Number(rec.amount) : -Number(rec.amount)
          runningBalance += amount

          dayTransactions.push({
            description: rec.description,
            amount: Number(rec.amount),
            type: rec.type,
            category: rec.category,
            isRecurring: true
          })
        }
      })

      // Adicionar simulação se aplicável
      if (simulation) {
        if (simulation.type === 'one-time' && dateStr === simulation.date) {
          // Despesa única na data específica
          runningBalance -= simulation.amount
          dayTransactions.push({
            description: `${simulation.description} (Simulação)`,
            amount: simulation.amount,
            type: 'expense',
            category: { name: 'Simulação', icon: '💡' },
            isRecurring: false,
            isSimulation: true
          })
        } else if (simulation.type === 'recurring') {
          // Recorrência simulada
          const simDate = new Date(simulation.date + 'T00:00:00')
          if (currentDate >= simDate) {
            const simRecurring = {
              frequency: simulation.frequency,
              day_of_month: simDate.getDate(),
              day_of_week: simDate.getDay()
            } as RecurringTransaction

            const shouldExecute = checkIfShouldExecute(simRecurring, currentDate)
            if (shouldExecute) {
              runningBalance -= simulation.amount
              dayTransactions.push({
                description: `${simulation.description} (Simulação)`,
                amount: simulation.amount,
                type: 'expense',
                category: { name: 'Simulação', icon: '💡' },
                isRecurring: true,
                isSimulation: true
              })
            }
          }
        }
      }

      projections.push({
        date: dateStr,
        balance: runningBalance,
        transactions: dayTransactions,
        isNegative: runningBalance < 0
      })

      // Alertas
      if (runningBalance < 0 && !alerts.find(a => a.type === 'negative')) {
        alerts.push({
          date: dateStr,
          type: 'negative',
          message: 'Saldo ficará negativo'
        })
      }

      if (runningBalance < 100 && runningBalance >= 0 && !alerts.find(a => a.type === 'low')) {
        alerts.push({
          date: dateStr,
          type: 'low',
          message: 'Saldo ficará abaixo de R$ 100'
        })
      }
    }

    return NextResponse.json({
      currentBalance: totalBalance,
      projections,
      alerts,
      accounts,
      hasSimulation: !!simulation,
      simulation: simulation || null
    })

  } catch (e: any) {
    console.error('Erro ao calcular projeções:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function checkIfShouldExecute(recurring: RecurringTransaction, date: Date): boolean {
  const day = date.getDate()
  const weekDay = date.getDay()

  switch (recurring.frequency) {
    case 'daily':
      return true

    case 'weekly':
      return weekDay === recurring.day_of_week

    case 'biweekly':
      return weekDay === recurring.day_of_week

    case 'monthly':
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      const targetDay = Math.min(recurring.day_of_month || 1, lastDay)
      return day === targetDay

    case 'yearly':
      return false // Não projetar anual para 30 dias

    default:
      return false
  }
}
