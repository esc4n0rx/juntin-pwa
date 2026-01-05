import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();

        // Get User Profile to find couple_id
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id, mode')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        // Fetch Investments for the couple with contribution count
        const { data: investments, error } = await adminDb
            .from('investments')
            .select(`
                *,
                user:profiles(id, full_name, avatar_url)
            `)
            .eq('couple_id', profile.couple_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Para cada investimento, buscar total de aportes
        const investmentsWithContributions = await Promise.all(
            (investments || []).map(async (investment) => {
                const { count } = await adminDb
                    .from('investment_contributions')
                    .select('*', { count: 'exact', head: true })
                    .eq('investment_id', investment.id);

                return {
                    ...investment,
                    contributions_count: count || 0
                };
            })
        );

        return NextResponse.json({ investments: investmentsWithContributions || [] });

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

        const { name, type, icon, initial_amount, target_amount, institution } = await request.json();

        // Validações
        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
        }
        if (!type || !type.trim()) {
            return NextResponse.json({ error: 'Tipo obrigatório' }, { status: 400 });
        }
        if (initial_amount && initial_amount < 0) {
            return NextResponse.json({ error: 'Valor inicial inválido' }, { status: 400 });
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

        // Criar investimento
        const { data: investment, error } = await adminDb
            .from('investments')
            .insert({
                name: name.trim(),
                type: type.trim(),
                icon: icon || '💰',
                initial_amount: initial_amount || 0,
                current_amount: initial_amount || 0,
                target_amount: target_amount || null,
                institution: institution?.trim() || null,
                couple_id: profile.couple_id,
                user_id: payload.userId
            })
            .select(`
                *,
                user:profiles(id, full_name, avatar_url)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ investment: { ...investment, contributions_count: 0 } });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id, name, type, icon, current_amount, target_amount, institution } = await request.json();

        if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

        const adminDb = createAdminClient();

        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (type !== undefined) updates.type = type;
        if (icon !== undefined) updates.icon = icon;
        if (current_amount !== undefined) updates.current_amount = current_amount;
        if (target_amount !== undefined) updates.target_amount = target_amount;
        if (institution !== undefined) updates.institution = institution;

        const { data: investment, error } = await adminDb
            .from('investments')
            .update(updates)
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .select(`
                *,
                user:profiles(id, full_name, avatar_url)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ investment });

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

        const { error } = await adminDb
            .from('investments')
            .delete()
            .eq('id', id)
            .eq('couple_id', profile.couple_id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
