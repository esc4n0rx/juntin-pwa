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

        const { goal_id, amount } = await request.json();

        // Validações
        if (!goal_id) {
            return NextResponse.json({ error: 'ID do objetivo obrigatório' }, { status: 400 });
        }
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
        }

        const adminDb = createAdminClient();

        // Get couple_id
        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 });
        }

        // Buscar o objetivo atual
        const { data: currentGoal, error: fetchError } = await adminDb
            .from('goals')
            .select('id, current_amount, target_amount, couple_id')
            .eq('id', goal_id)
            .eq('couple_id', profile.couple_id)
            .single();

        if (fetchError || !currentGoal) {
            return NextResponse.json({ error: 'Objetivo não encontrado' }, { status: 404 });
        }

        // Calcular novo saldo (não pode passar do target)
        const newAmount = Math.min(
            currentGoal.current_amount + amount,
            currentGoal.target_amount
        );

        // Atualizar o objetivo
        const { data: updatedGoal, error: updateError } = await adminDb
            .from('goals')
            .update({
                current_amount: newAmount
            })
            .eq('id', goal_id)
            .eq('couple_id', profile.couple_id)
            .select(`
                *,
                user:profiles(id, full_name, avatar_url)
            `)
            .single();

        if (updateError) throw updateError;

        // Verificar se completou o objetivo
        const isCompleted = newAmount >= currentGoal.target_amount;

        return NextResponse.json({
            goal: updatedGoal,
            completed: isCompleted,
            added_amount: newAmount - currentGoal.current_amount
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
