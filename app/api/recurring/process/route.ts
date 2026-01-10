import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * API de Processamento Automático de Contas Recorrentes
 *
 * Esta API deve ser chamada quando o usuário faz login ou acessa o app.
 * Ela verifica todas as contas recorrentes ativas e gera lançamentos automáticos
 * para as que estão pendentes.
 */

type RecurringTransaction = {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
    day_of_month: number | null;
    day_of_week: number | null;
    start_date: string;
    last_execution_date: string | null;
    category_id: string | null;
    account_id: string;
    couple_id: string;
    user_id: string | null;
}

function shouldExecuteToday(recurring: RecurringTransaction, today: Date): boolean {
    const todayDay = today.getDate();
    const todayWeekDay = today.getDay();
    const todayStr = today.toISOString().split('T')[0];

    // Não executar se start_date é futuro
    if (recurring.start_date > todayStr) {
        return false;
    }

    // Se já foi executada hoje, não executar novamente
    if (recurring.last_execution_date === todayStr) {
        return false;
    }

    switch (recurring.frequency) {
        case 'daily':
            // Executa todos os dias
            return true;

        case 'weekly':
            // Executa no dia da semana especificado
            return todayWeekDay === recurring.day_of_week;

        case 'biweekly':
            // Executa a cada 2 semanas no dia da semana especificado
            if (todayWeekDay !== recurring.day_of_week) return false;

            if (!recurring.last_execution_date) return true;

            const lastExec = new Date(recurring.last_execution_date);
            const diffDays = Math.floor((today.getTime() - lastExec.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 14;

        case 'monthly':
            // Executa no dia do mês especificado
            // Se o dia não existe no mês (ex: 31 em fevereiro), executa no último dia do mês
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const targetDay = Math.min(recurring.day_of_month || 1, lastDayOfMonth);
            return todayDay === targetDay;

        case 'yearly':
            // Executa uma vez por ano na mesma data
            const startDate = new Date(recurring.start_date);
            return today.getDate() === startDate.getDate() &&
                   today.getMonth() === startDate.getMonth();

        default:
            return false;
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();

        // Buscar couple_id do usuário
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        // Buscar todas as contas recorrentes ativas do casal
        const { data: recurringTransactions, error: fetchError } = await adminDb
            .from('recurring_transactions')
            .select('*')
            .eq('couple_id', profile.couple_id)
            .eq('is_active', true);

        if (fetchError) throw fetchError;

        if (!recurringTransactions || recurringTransactions.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Nenhuma conta recorrente ativa',
                processed: 0
            });
        }

        // Data de hoje (timezone America/Sao_Paulo)
        const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
        const todayStr = today.toISOString().split('T')[0];

        const transactionsToCreate: any[] = [];
        const recurringToUpdate: string[] = [];

        // Processar cada conta recorrente
        for (const recurring of recurringTransactions) {
            if (shouldExecuteToday(recurring, today)) {
                // Criar lançamento
                transactionsToCreate.push({
                    type: recurring.type,
                    category_id: recurring.category_id,
                    amount: recurring.amount,
                    date: todayStr,
                    description: recurring.description,
                    couple_id: recurring.couple_id,
                    user_id: recurring.user_id,
                    account_id: recurring.account_id,
                    recurring_transaction_id: recurring.id
                });

                recurringToUpdate.push(recurring.id);
            }
        }

        // Inserir lançamentos em lote
        if (transactionsToCreate.length > 0) {
            const { error: insertError } = await adminDb
                .from('transactions')
                .insert(transactionsToCreate);

            if (insertError) throw insertError;

            // Atualizar last_execution_date das contas recorrentes
            for (const id of recurringToUpdate) {
                await adminDb
                    .from('recurring_transactions')
                    .update({ last_execution_date: todayStr })
                    .eq('id', id);
            }

            // Atualizar saldo das contas afetadas
            const accountIds = Array.from(new Set(transactionsToCreate.map(t => t.account_id)));
            for (const accountId of accountIds) {
                await updateAccountBalance(adminDb, accountId);
            }
        }

        return NextResponse.json({
            success: true,
            processed: transactionsToCreate.length,
            date: todayStr
        });

    } catch (e: any) {
        console.error('Erro ao processar contas recorrentes:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

/**
 * Atualiza o current_balance de uma conta baseado em todas as suas transações
 */
async function updateAccountBalance(adminDb: any, accountId: string) {
    try {
        // Buscar conta
        const { data: account } = await adminDb
            .from('accounts')
            .select('initial_balance')
            .eq('id', accountId)
            .single();

        if (!account) return;

        // Calcular total de receitas e despesas
        const { data: transactions } = await adminDb
            .from('transactions')
            .select('type, amount')
            .eq('account_id', accountId);

        if (!transactions) return;

        let totalIncome = 0;
        let totalExpense = 0;

        for (const trans of transactions) {
            if (trans.type === 'income') {
                totalIncome += Number(trans.amount);
            } else {
                totalExpense += Number(trans.amount);
            }
        }

        const currentBalance = Number(account.initial_balance) + totalIncome - totalExpense;

        // Atualizar current_balance
        await adminDb
            .from('accounts')
            .update({ current_balance: currentBalance })
            .eq('id', accountId);

    } catch (e) {
        console.error('Erro ao atualizar saldo da conta:', e);
    }
}
