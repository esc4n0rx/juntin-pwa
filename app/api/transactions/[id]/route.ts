import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Recalcula o saldo de uma conta baseado em todas as suas transações
 */
async function recalculateAccountBalance(adminDb: any, accountId: string) {
    try {
        const { data: account } = await adminDb
            .from('accounts')
            .select('initial_balance')
            .eq('id', accountId)
            .single();

        if (!account) return;

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

        await adminDb
            .from('accounts')
            .update({ current_balance: currentBalance })
            .eq('id', accountId);
    } catch (e) {
        console.error('Erro ao recalcular saldo:', e);
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();
        const { id } = await params;
        const { type, category_id, amount, date, description, account_id } = await request.json();

        // Validações
        if (!type || !['income', 'expense'].includes(type)) {
            return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
        }
        if (!category_id) {
            return NextResponse.json({ error: 'Categoria obrigatória' }, { status: 400 });
        }
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
        }
        if (!date) {
            return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });
        }

        // Get couple_id
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        // Verificar se a transação pertence ao casal do usuário
        const { data: existingTransaction } = await adminDb
            .from('transactions')
            .select('id, type, amount, account_id')
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .single();

        if (!existingTransaction) {
            return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
        }

        // Verificar se a categoria pertence ao casal
        const { data: category } = await adminDb
            .from('categories')
            .select('id')
            .eq('id', category_id)
            .or(`couple_id.is.null,couple_id.eq.${profile.couple_id}`)
            .single();

        if (!category) {
            return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
        }

        // Se account_id foi alterado, verificar se a conta existe
        if (account_id && account_id !== existingTransaction.account_id) {
            const { data: account } = await adminDb
                .from('accounts')
                .select('id')
                .eq('id', account_id)
                .eq('couple_id', profile.couple_id)
                .eq('is_active', true)
                .single();

            if (!account) {
                return NextResponse.json({ error: 'Conta bancária não encontrada' }, { status: 404 });
            }
        }

        // Atualizar transação
        const updateData: any = {
            type,
            category_id,
            amount,
            date,
            description: description || null,
        };

        if (account_id) {
            updateData.account_id = account_id;
        }

        const { data: transaction, error } = await adminDb
            .from('transactions')
            .update(updateData)
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .select(`
                *,
                category:categories(id, name, icon, color, type),
                user:profiles(id, full_name, avatar_url),
                account:accounts(id, name, icon, type)
            `)
            .single();

        if (error) throw error;

        // Recalcular saldo das contas afetadas
        const accountsToUpdate = [existingTransaction.account_id];
        if (account_id && account_id !== existingTransaction.account_id) {
            accountsToUpdate.push(account_id);
        }

        for (const accId of accountsToUpdate) {
            if (accId) {
                await recalculateAccountBalance(adminDb, accId);
            }
        }

        return NextResponse.json({ transaction });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();
        const { id } = await params;

        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        // Buscar transação para atualizar saldo da conta depois
        const { data: transaction } = await adminDb
            .from('transactions')
            .select('account_id')
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .single();

        // Deletar apenas se pertence ao couple_id do usuário
        const { error } = await adminDb
            .from('transactions')
            .delete()
            .eq('id', id)
            .eq('couple_id', profile.couple_id);

        if (error) throw error;

        // Recalcular saldo da conta
        if (transaction?.account_id) {
            await recalculateAccountBalance(adminDb, transaction.account_id);
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
