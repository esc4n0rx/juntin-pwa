import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET - Buscar todas as contas do casal
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
            .select('couple_id, mode')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        // Buscar contas do casal
        const { data: accounts, error } = await adminDb
            .from('accounts')
            .select('*')
            .eq('couple_id', profile.couple_id)
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ accounts: accounts || [] });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST - Criar nova conta
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();

        const { name, type, initial_balance, icon, color } = await request.json();

        // Validações
        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
        }
        if (!type || !['checking', 'savings', 'investment', 'cash', 'other'].includes(type)) {
            return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
        }
        if (initial_balance === undefined || initial_balance === null) {
            return NextResponse.json({ error: 'Saldo inicial obrigatório' }, { status: 400 });
        }

        // Buscar couple_id
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        let coupleId = profile?.couple_id;

        // Se não tem couple_id, criar um novo (onboarding em andamento)
        if (!coupleId) {
            console.log('[ACCOUNTS] Criando novo couple para user:', payload.userId);

            const { data: newCouple, error: coupleError } = await adminDb
                .from('couples')
                .insert([{}]) // Criar com valores default, income será definido depois no onboarding
                .select()
                .single();

            if (coupleError) {
                console.error('[ACCOUNTS] Erro ao criar couple:', coupleError);
                return NextResponse.json({
                    error: 'Erro ao criar configuração',
                    details: coupleError.message
                }, { status: 500 });
            }

            if (!newCouple) {
                console.error('[ACCOUNTS] Couple criado mas sem dados retornados');
                return NextResponse.json({ error: 'Erro ao criar configuração' }, { status: 500 });
            }

            coupleId = newCouple.id;
            console.log('[ACCOUNTS] Couple criado com sucesso:', coupleId);

            // Atualizar perfil com o couple_id
            const { error: updateError } = await adminDb
                .from('profiles')
                .update({ couple_id: coupleId })
                .eq('id', payload.userId);

            if (updateError) {
                console.error('[ACCOUNTS] Erro ao atualizar profile com couple_id:', updateError);
            }
        }

        // Criar conta
        const { data: account, error } = await adminDb
            .from('accounts')
            .insert({
                name: name.trim(),
                type,
                initial_balance: Number(initial_balance),
                current_balance: Number(initial_balance),
                couple_id: profile.couple_id,
                icon: icon || '💳',
                color: color || null,
                is_migration_account: false,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ account });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PUT - Atualizar conta existente
export async function PUT(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();

        const { id, name, type, current_balance, icon, color, is_migration_account } = await request.json();

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

        // Verificar se a conta pertence ao casal
        const { data: existingAccount } = await adminDb
            .from('accounts')
            .select('id')
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .single();

        if (!existingAccount) {
            return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
        }

        // Preparar dados para atualização
        const updateData: any = {};
        if (name !== undefined) updateData.name = name.trim();
        if (type !== undefined) updateData.type = type;
        if (current_balance !== undefined) updateData.current_balance = Number(current_balance);
        if (icon !== undefined) updateData.icon = icon;
        if (color !== undefined) updateData.color = color;
        if (is_migration_account !== undefined) updateData.is_migration_account = is_migration_account;

        // Atualizar conta
        const { data: account, error } = await adminDb
            .from('accounts')
            .update(updateData)
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ account });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE - Desativar conta (soft delete)
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

        // Verificar se há transações vinculadas
        const { data: transactions } = await adminDb
            .from('transactions')
            .select('id')
            .eq('account_id', id)
            .limit(1);

        if (transactions && transactions.length > 0) {
            // Soft delete - apenas desativa
            const { error } = await adminDb
                .from('accounts')
                .update({ is_active: false })
                .eq('id', id)
                .eq('couple_id', profile.couple_id);

            if (error) throw error;

            return NextResponse.json({
                success: true,
                message: 'Conta desativada (possui transações vinculadas)'
            });
        } else {
            // Hard delete - sem transações
            const { error } = await adminDb
                .from('accounts')
                .delete()
                .eq('id', id)
                .eq('couple_id', profile.couple_id);

            if (error) throw error;

            return NextResponse.json({
                success: true,
                message: 'Conta excluída'
            });
        }

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
