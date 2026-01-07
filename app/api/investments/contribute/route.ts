import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { investment_id, amount, date, description } = await request.json();

        if (!investment_id) {
            return NextResponse.json({ error: 'ID do investimento obrigatório' }, { status: 400 });
        }
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
        }

        const adminDb = createAdminClient();

        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        const { data: investment, error: fetchError } = await adminDb
            .from('investments')
            .select('id, couple_id, current_amount')
            .eq('id', investment_id)
            .eq('couple_id', profile.couple_id)
            .single();

        if (fetchError || !investment) {
            return NextResponse.json({ error: 'Investimento não encontrado' }, { status: 404 });
        }

        const { data: contribution, error: contributionError } = await adminDb
            .from('investment_contributions')
            .insert({
                investment_id,
                amount,
                date: date || new Date().toISOString().split('T')[0],
                description: description || null,
                user_id: payload.userId,
                couple_id: profile.couple_id
            })
            .select(`
                *,
                user:profiles(id, full_name, avatar_url)
            `)
            .single();

        if (contributionError) throw contributionError;

        const { data: updatedInvestment } = await adminDb
            .from('investments')
            .select(`
                *,
                user:profiles(id, full_name, avatar_url)
            `)
            .eq('id', investment_id)
            .single();

        return NextResponse.json({
            contribution,
            investment: updatedInvestment,
            new_amount: updatedInvestment?.current_amount
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const investment_id = searchParams.get('investment_id');

        if (!investment_id) {
            return NextResponse.json({ error: 'ID do investimento obrigatório' }, { status: 400 });
        }

        const adminDb = createAdminClient();

        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        const { data: contributions, error } = await adminDb
            .from('investment_contributions')
            .select(`
                *,
                user:profiles(id, full_name, avatar_url)
            `)
            .eq('investment_id', investment_id)
            .eq('couple_id', profile.couple_id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ contributions: contributions || [] });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
