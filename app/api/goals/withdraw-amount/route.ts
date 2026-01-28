import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const WITHDRAW_CATEGORY_NAME = "Retirada de objetivo";

const getSaoPauloDate = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { goal_id, amount, account_id } = await request.json();

    if (!goal_id) {
      return NextResponse.json({ error: "ID do objetivo obrigatório" }, { status: 400 });
    }
    if (!account_id) {
      return NextResponse.json({ error: "Conta obrigatória" }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }

    const adminDb = createAdminClient();

    const { data: profile } = await adminDb
      .from("profiles")
      .select("couple_id")
      .eq("id", payload.userId)
      .single();

    if (!profile?.couple_id) {
      return NextResponse.json({ error: "Configuração não encontrada" }, { status: 400 });
    }

    const { data: currentGoal, error: fetchError } = await adminDb
      .from("goals")
      .select("id, name, current_amount, target_amount, couple_id")
      .eq("id", goal_id)
      .eq("couple_id", profile.couple_id)
      .single();

    if (fetchError || !currentGoal) {
      return NextResponse.json({ error: "Objetivo não encontrado" }, { status: 404 });
    }

    if (amount > currentGoal.current_amount) {
      return NextResponse.json({ error: "Saldo insuficiente no objetivo" }, { status: 400 });
    }

    const { data: account } = await adminDb
      .from("accounts")
      .select("id, current_balance, is_active")
      .eq("id", account_id)
      .eq("couple_id", profile.couple_id)
      .eq("is_active", true)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Conta bancária não encontrada" }, { status: 404 });
    }

    let { data: category } = await adminDb
      .from("categories")
      .select("id, name, icon, color")
      .eq("name", WITHDRAW_CATEGORY_NAME)
      .eq("type", "income")
      .or(`couple_id.is.null,couple_id.eq.${profile.couple_id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!category) {
      const { data: newCategory, error: categoryError } = await adminDb
        .from("categories")
        .insert({
          name: WITHDRAW_CATEGORY_NAME,
          icon: "🎯",
          color: "#10b981",
          type: "income",
          couple_id: profile.couple_id,
        })
        .select()
        .single();

      if (categoryError) throw categoryError;
      category = newCategory;
    }

    const newAmount = currentGoal.current_amount - amount;

    const { data: updatedGoal, error: updateError } = await adminDb
      .from("goals")
      .update({
        current_amount: newAmount,
      })
      .eq("id", goal_id)
      .eq("couple_id", profile.couple_id)
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .single();

    if (updateError) throw updateError;

    const { data: transaction, error: transactionError } = await adminDb
      .from("transactions")
      .insert({
        type: "income",
        category_id: category.id,
        amount,
        date: getSaoPauloDate(),
        description: `Retirada do objetivo: ${currentGoal.name}`,
        couple_id: profile.couple_id,
        user_id: payload.userId,
        account_id: account_id,
      })
      .select(`
        *,
        category:categories(id, name, icon, color, type),
        user:profiles(id, full_name, avatar_url),
        account:accounts(id, name, icon, type)
      `)
      .single();

    if (transactionError) throw transactionError;

    const newBalance = account.current_balance + amount;

    await adminDb
      .from("accounts")
      .update({ current_balance: newBalance })
      .eq("id", account_id);

    return NextResponse.json({
      goal: updatedGoal,
      transaction,
      withdrawn_amount: amount,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
