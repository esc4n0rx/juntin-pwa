import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();
        const { id } = params;
        const { type, category_id, amount, date, description } = await request.json();

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
            .select('id')
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

        // Atualizar transação
        const { data: transaction, error } = await adminDb
            .from('transactions')
            .update({
                type,
                category_id,
                amount,
                date,
                description: description || null,
            })
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .select(`
                *,
                category:categories(id, name, icon, color, type),
                user:profiles(id, full_name, avatar_url)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ transaction });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();
        const { id } = params;

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
