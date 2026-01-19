import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseTransferDescription } from "@/lib/transfers";

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();

        // 1. Get User Profile to find couple_id and mode
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id, mode')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        // 2. Get URL params for filtering
        const { searchParams } = new URL(request.url);
        const dateFilter = searchParams.get('date'); // Formato: YYYY-MM-DD

        // 3. Fetch Transactions
        let query = adminDb
            .from('transactions')
            .select(`
                *,
                category:categories(id, name, icon, color, type),
                user:profiles(id, full_name, avatar_url),
                account:accounts(id, name, icon, type)
            `)
            .eq('couple_id', profile.couple_id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        // Se dateFilter foi passado, filtrar por data específica
        if (dateFilter) {
            query = query.eq('date', dateFilter);
        }

        const { data: transactions, error } = await query;

        if (error) throw error;

        const combinedTransactions: any[] = [];
        const transferMap = new Map<
            string,
            { expense?: any; income?: any; note: string }
        >();

        for (const transaction of transactions || []) {
            const transferInfo = parseTransferDescription(transaction.description);
            if (!transferInfo) {
                combinedTransactions.push(transaction);
                continue;
            }

            const entry = transferMap.get(transferInfo.transferId) ?? {
                note: transferInfo.note,
            };

            if (transaction.type === "expense") {
                entry.expense = transaction;
            } else if (transaction.type === "income") {
                entry.income = transaction;
            }

            transferMap.set(transferInfo.transferId, entry);
        }

        for (const [transferId, entry] of transferMap.entries()) {
            const baseTransaction = entry.expense ?? entry.income;
            if (!baseTransaction) continue;

            combinedTransactions.push({
                ...baseTransaction,
                id: transferId,
                type: "transfer",
                amount: entry.expense?.amount ?? entry.income?.amount ?? 0,
                description: entry.note || null,
                category: {
                    id: "transfer",
                    name: "Transferência",
                    icon: "🔁",
                    color: "#60a5fa",
                },
                transfer: {
                    fromAccount: entry.expense?.account ?? null,
                    toAccount: entry.income?.account ?? null,
                },
            });
        }

        combinedTransactions.sort((a, b) => {
            if (a.date !== b.date) {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            }

            const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bCreated - aCreated;
        });

        return NextResponse.json({ transactions: combinedTransactions });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
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
        if (!account_id) {
            return NextResponse.json({ error: 'Conta bancária obrigatória' }, { status: 400 });
        }

        // Get couple_id and mode
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id, mode')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
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

        // Verificar se a conta bancária pertence ao casal
        const { data: account } = await adminDb
            .from('accounts')
            .select('id, current_balance, is_active')
            .eq('id', account_id)
            .eq('couple_id', profile.couple_id)
            .eq('is_active', true)
            .single();

        if (!account) {
            return NextResponse.json({ error: 'Conta bancária não encontrada' }, { status: 404 });
        }

        // Criar transação
        // Se mode === 'solo', user_id é sempre o próprio usuário
        // Se mode === 'couple', user_id indica quem está lançando
        const { data: transaction, error } = await adminDb
            .from('transactions')
            .insert({
                type,
                category_id,
                amount,
                date,
                description: description || null,
                couple_id: profile.couple_id,
                user_id: payload.userId,
                account_id: account_id
            })
            .select(`
                *,
                category:categories(id, name, icon, color, type),
                user:profiles(id, full_name, avatar_url),
                account:accounts(id, name, icon, type)
            `)
            .single();

        if (error) throw error;

        // Atualizar saldo da conta
        const newBalance = type === 'income'
            ? account.current_balance + amount
            : account.current_balance - amount;

        await adminDb
            .from('accounts')
            .update({ current_balance: newBalance })
            .eq('id', account_id);

        return NextResponse.json({ transaction });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await request.json();

        if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

        const adminDb = createAdminClient();

        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        // Deletar apenas se pertence ao couple_id do usuário
        const { error } = await adminDb
            .from('transactions')
            .delete()
            .eq('id', id)
            .eq('couple_id', profile.couple_id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
