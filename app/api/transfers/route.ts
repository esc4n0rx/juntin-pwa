import { createAdminClient } from "@/lib/supabase/admin"
import { verifyToken } from "@/lib/auth-server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"
import { buildTransferDescription } from "@/lib/transfers"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminDb = createAdminClient()
    const { amount, date, description, from_account_id, to_account_id } =
      await request.json()

    if (!from_account_id || !to_account_id) {
      return NextResponse.json(
        { error: "Contas obrigatórias" },
        { status: 400 }
      )
    }

    if (from_account_id === to_account_id) {
      return NextResponse.json(
        { error: "Selecione contas diferentes" },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: "Data obrigatória" }, { status: 400 })
    }

    const { data: profile } = await adminDb
      .from("profiles")
      .select("couple_id")
      .eq("id", payload.userId)
      .single()

    if (!profile?.couple_id) {
      return NextResponse.json(
        { error: "Configuração não encontrada" },
        { status: 400 }
      )
    }

    const { data: accounts } = await adminDb
      .from("accounts")
      .select("id, name, icon, current_balance, is_active")
      .in("id", [from_account_id, to_account_id])
      .eq("couple_id", profile.couple_id)
      .eq("is_active", true)

    if (!accounts || accounts.length !== 2) {
      return NextResponse.json(
        { error: "Contas bancárias não encontradas" },
        { status: 404 }
      )
    }

    const fromAccount = accounts.find((acc) => acc.id === from_account_id)
    const toAccount = accounts.find((acc) => acc.id === to_account_id)

    if (!fromAccount || !toAccount) {
      return NextResponse.json(
        { error: "Contas bancárias não encontradas" },
        { status: 404 }
      )
    }

    const transferId = randomUUID()
    const transferDescription = buildTransferDescription(
      transferId,
      description
    )

    const { data: transactions, error } = await adminDb
      .from("transactions")
      .insert([
        {
          type: "expense",
          amount,
          date,
          description: transferDescription,
          couple_id: profile.couple_id,
          user_id: payload.userId,
          account_id: from_account_id,
        },
        {
          type: "income",
          amount,
          date,
          description: transferDescription,
          couple_id: profile.couple_id,
          user_id: payload.userId,
          account_id: to_account_id,
        },
      ])
      .select(
        `
        *,
        category:categories(id, name, icon, color, type),
        user:profiles(id, full_name, avatar_url),
        account:accounts(id, name, icon, type)
      `
      )

    if (error) throw error

    await adminDb
      .from("accounts")
      .update({ current_balance: fromAccount.current_balance - amount })
      .eq("id", from_account_id)

    await adminDb
      .from("accounts")
      .update({ current_balance: toAccount.current_balance + amount })
      .eq("id", to_account_id)

    const expenseTransaction = transactions?.find(
      (transaction) => transaction.type === "expense"
    )
    const incomeTransaction = transactions?.find(
      (transaction) => transaction.type === "income"
    )

    return NextResponse.json({
      transaction: {
        id: transferId,
        type: "transfer",
        amount,
        date,
        description: description || null,
        category: {
          id: "transfer",
          name: "Transferência",
          icon: "🔁",
          color: "#60a5fa",
        },
        transfer: {
          fromAccount: expenseTransaction?.account ?? {
            id: fromAccount.id,
            name: fromAccount.name,
            icon: fromAccount.icon,
          },
          toAccount: incomeTransaction?.account ?? {
            id: toAccount.id,
            name: toAccount.name,
            icon: toAccount.icon,
          },
        },
        user: expenseTransaction?.user ?? null,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
