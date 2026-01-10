import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET - Buscar todas as contas recorrentes do casal
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
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        // Buscar contas recorrentes com relacionamentos
        const { data: recurring, error } = await adminDb
            .from('recurring_transactions')
            .select(`
                *,
                category:categories(id, name, icon, color),
                account:accounts(id, name, icon, type),
                user:profiles(id, full_name, avatar_url)
            `)
            .eq('couple_id', profile.couple_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ recurring: recurring || [] });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST - Criar nova conta recorrente
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();

        const {
            description,
            amount,
            type,
            frequency,
            day_of_month,
            day_of_week,
            start_date,
            category_id,
            account_id
        } = await request.json();

        // Validações
        if (!description || !description.trim()) {
            return NextResponse.json({ error: 'Descrição obrigatória' }, { status: 400 });
        }
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
        }
        if (!type || !['income', 'expense'].includes(type)) {
            return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
        }
        if (!frequency || !['daily', 'weekly', 'biweekly', 'monthly', 'yearly'].includes(frequency)) {
            return NextResponse.json({ error: 'Frequência inválida' }, { status: 400 });
        }
        if (!account_id) {
            return NextResponse.json({ error: 'Conta bancária obrigatória' }, { status: 400 });
        }
        if (!start_date) {
            return NextResponse.json({ error: 'Data de início obrigatória' }, { status: 400 });
        }

        // Validações específicas por frequência
        if (frequency === 'monthly' && (!day_of_month || day_of_month < 1 || day_of_month > 31)) {
            return NextResponse.json({ error: 'Dia do mês inválido' }, { status: 400 });
        }
        if ((frequency === 'weekly' || frequency === 'biweekly') && (day_of_week === undefined || day_of_week < 0 || day_of_week > 6)) {
            return NextResponse.json({ error: 'Dia da semana inválido' }, { status: 400 });
        }

        // Buscar couple_id
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        // Verificar se conta bancária existe e pertence ao casal
        const { data: account } = await adminDb
            .from('accounts')
            .select('id')
            .eq('id', account_id)
            .eq('couple_id', profile.couple_id)
            .single();

        if (!account) {
            return NextResponse.json({ error: 'Conta bancária não encontrada' }, { status: 404 });
        }

        // Criar conta recorrente
        const { data: recurringTransaction, error } = await adminDb
            .from('recurring_transactions')
            .insert({
                description: description.trim(),
                amount: Number(amount),
                type,
                frequency,
                day_of_month: frequency === 'monthly' ? day_of_month : null,
                day_of_week: (frequency === 'weekly' || frequency === 'biweekly') ? day_of_week : null,
                start_date,
                category_id: category_id || null,
                account_id,
                couple_id: profile.couple_id,
                user_id: payload.userId,
                is_active: true,
            })
            .select(`
                *,
                category:categories(id, name, icon, color),
                account:accounts(id, name, icon, type),
                user:profiles(id, full_name, avatar_url)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ recurring: recurringTransaction });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PUT - Atualizar conta recorrente existente
export async function PUT(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();

        const {
            id,
            description,
            amount,
            category_id,
            account_id,
            is_active
        } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
        }

        // Buscar couple_id do usuário
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Verificar se a conta recorrente pertence ao casal
        const { data: existing } = await adminDb
            .from('recurring_transactions')
            .select('id')
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Conta recorrente não encontrada' }, { status: 404 });
        }

        // Preparar dados para atualização
        const updateData: any = {};
        if (description !== undefined) updateData.description = description.trim();
        if (amount !== undefined) updateData.amount = Number(amount);
        if (category_id !== undefined) updateData.category_id = category_id;
        if (account_id !== undefined) updateData.account_id = account_id;
        if (is_active !== undefined) updateData.is_active = is_active;

        // Atualizar conta recorrente
        const { data: recurringTransaction, error } = await adminDb
            .from('recurring_transactions')
            .update(updateData)
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .select(`
                *,
                category:categories(id, name, icon, color),
                account:accounts(id, name, icon, type),
                user:profiles(id, full_name, avatar_url)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ recurring: recurringTransaction });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE - Desativar conta recorrente (soft delete)
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

        // Soft delete - apenas desativa
        const { error } = await adminDb
            .from('recurring_transactions')
            .update({ is_active: false })
            .eq('id', id)
            .eq('couple_id', profile.couple_id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Conta recorrente desativada'
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
