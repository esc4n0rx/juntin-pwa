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

        // 1. Get User Profile to find couple_id
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id, mode')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        // 2. Fetch Goals for the couple
        const { data: goals, error } = await adminDb
            .from('goals')
            .select(`
                *,
                user:profiles(id, full_name, avatar_url)
            `)
            .eq('couple_id', profile.couple_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ goals: goals || [] });

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

        const { name, icon, target_amount } = await request.json();

        // Validações
        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
        }
        if (!target_amount || target_amount <= 0) {
            return NextResponse.json({ error: 'Valor alvo inválido' }, { status: 400 });
        }

        // Get couple_id
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id, mode')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        // Criar objetivo
        const { data: goal, error } = await adminDb
            .from('goals')
            .insert({
                name: name.trim(),
                icon: icon || '🎯',
                target_amount,
                current_amount: 0,
                couple_id: profile.couple_id,
                user_id: payload.userId,
                completed: false
            })
            .select(`
                *,
                user:profiles(id, full_name, avatar_url)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ goal });

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

        const { id, name, icon, current_amount } = await request.json();

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
        if (icon !== undefined) updates.icon = icon;
        if (current_amount !== undefined) updates.current_amount = current_amount;

        const { data: goal, error } = await adminDb
            .from('goals')
            .update(updates)
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .select(`
                *,
                user:profiles(id, full_name, avatar_url)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ goal });

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
            .from('goals')
            .delete()
            .eq('id', id)
            .eq('couple_id', profile.couple_id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
