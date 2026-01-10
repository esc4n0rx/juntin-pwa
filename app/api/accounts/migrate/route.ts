import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * API de Migração de Usuários Antigos
 *
 * Esta API executa a migração automática para usuários que possuem
 * transações mas ainda não possuem contas bancárias definidas.
 *
 * O processo:
 * 1. Verifica se o usuário já possui contas
 * 2. Verifica se o usuário possui transações
 * 3. Cria automaticamente a "Conta Principal"
 * 4. Vincula todas as transações existentes à Conta Principal
 * 5. Calcula o saldo atual baseado no histórico
 */

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

        // Verificar se já possui contas
        const { data: existingAccounts } = await adminDb
            .from('accounts')
            .select('id')
            .eq('couple_id', profile.couple_id)
            .limit(1);

        if (existingAccounts && existingAccounts.length > 0) {
            return NextResponse.json({
                success: false,
                message: 'Usuário já possui contas definidas'
            }, { status: 400 });
        }

        // Verificar se possui transações
        const { data: transactions } = await adminDb
            .from('transactions')
            .select('id, type, amount')
            .eq('couple_id', profile.couple_id);

        if (!transactions || transactions.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'Usuário não possui transações para migrar'
            }, { status: 400 });
        }

        // Calcular saldo baseado nas transações
        let totalIncome = 0;
        let totalExpense = 0;

        for (const trans of transactions) {
            if (trans.type === 'income') {
                totalIncome += Number(trans.amount);
            } else if (trans.type === 'expense') {
                totalExpense += Number(trans.amount);
            }
        }

        const calculatedBalance = totalIncome - totalExpense;

        // Criar Conta Principal
        const { data: newAccount, error: accountError } = await adminDb
            .from('accounts')
            .insert({
                name: 'Conta Principal',
                type: 'checking',
                initial_balance: 0,
                current_balance: calculatedBalance,
                is_migration_account: true,
                couple_id: profile.couple_id,
                icon: '🏦',
                is_active: true
            })
            .select()
            .single();

        if (accountError) throw accountError;

        // Vincular todas as transações à Conta Principal
        const { error: updateError } = await adminDb
            .from('transactions')
            .update({ account_id: newAccount.id })
            .eq('couple_id', profile.couple_id)
            .is('account_id', null);

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            account: newAccount,
            transactions_migrated: transactions.length,
            calculated_balance: calculatedBalance,
            message: 'Migração realizada com sucesso'
        });

    } catch (e: any) {
        console.error('Erro na migração:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

/**
 * GET - Verificar status de migração e calcular saldo
 * Retorna se o usuário precisa migrar e o saldo calculado
 */
export async function GET(request: Request) {
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
            return NextResponse.json({ needsMigration: false });
        }

        // Verificar se já possui contas
        const { data: accounts } = await adminDb
            .from('accounts')
            .select('id')
            .eq('couple_id', profile.couple_id)
            .limit(1);

        const hasAccounts = accounts && accounts.length > 0;

        // Verificar se possui transações e calcular saldo
        const { data: transactions } = await adminDb
            .from('transactions')
            .select('id, type, amount')
            .eq('couple_id', profile.couple_id);

        const hasTransactions = transactions && transactions.length > 0;

        // Calcular saldo se houver transações
        let calculatedBalance = 0;
        if (hasTransactions && transactions) {
            let totalIncome = 0;
            let totalExpense = 0;

            for (const trans of transactions) {
                if (trans.type === 'income') {
                    totalIncome += Number(trans.amount);
                } else if (trans.type === 'expense') {
                    totalExpense += Number(trans.amount);
                }
            }

            calculatedBalance = totalIncome - totalExpense;
        }

        // Usuário precisa migrar se:
        // - Tem transações E
        // - Não tem contas
        const needsMigration = hasTransactions && !hasAccounts;

        return NextResponse.json({
            needsMigration,
            hasAccounts,
            hasTransactions,
            calculated_balance: calculatedBalance,
            transaction_count: transactions?.length || 0
        });

    } catch (e: any) {
        console.error('Erro ao verificar status de migração:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
