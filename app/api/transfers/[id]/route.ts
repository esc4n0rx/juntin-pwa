import { createAdminClient } from "@/lib/supabase/admin"
import { verifyToken } from "@/lib/auth-server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { buildTransferDescription, TRANSFER_PREFIX } from "@/lib/transfers"

async function recalculateAccountBalance(adminDb: any, accountId: string) {
  try {
    const { data: account } = await adminDb
      .from("accounts")
      .select("initial_balance")
      .eq("id", accountId)
      .single()

    if (!account) return

    const { data: transactions } = await adminDb
      .from("transactions")
      .select("type, amount")
      .eq("account_id", accountId)

    if (!transactions) return

    let totalIncome = 0
    let totalExpense = 0

    for (const trans of transactions) {
      if (trans.type === "income") {
        totalIncome += Number(trans.amount)
      } else {
        totalExpense += Number(trans.amount)
      }
    }

    const currentBalance = Number(account.initial_balance) + totalIncome - totalExpense

    await adminDb
      .from("accounts")
      .update({ current_balance: currentBalance })
      .eq("id", accountId)
  } catch (e) {
    console.error("Erro ao recalcular saldo:", e)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminDb = createAdminClient()
    const { id } = await params
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
      .select("id, name, icon, is_active")
      .in("id", [from_account_id, to_account_id])
      .eq("couple_id", profile.couple_id)
      .eq("is_active", true)

    if (!accounts || accounts.length !== 2) {
      return NextResponse.json(
        { error: "Contas bancárias não encontradas" },
        { status: 404 }
      )
    }

    const { data: transferTransactions } = await adminDb
      .from("transactions")
      .select("id, type, account_id")
      .eq("couple_id", profile.couple_id)
      .like("description", `${TRANSFER_PREFIX}${id}::%`)

    if (!transferTransactions || transferTransactions.length === 0) {
      return NextResponse.json(
        { error: "Transferência não encontrada" },
        { status: 404 }
      )
    }

    const expenseTransaction = transferTransactions.find(
      (transaction) => transaction.type === "expense"
    )
    const incomeTransaction = transferTransactions.find(
      (transaction) => transaction.type === "income"
    )

    if (!expenseTransaction || !incomeTransaction) {
      return NextResponse.json(
        { error: "Transferência incompleta" },
        { status: 400 }
      )
    }

    const transferDescription = buildTransferDescription(id, description)

    const { error: expenseError } = await adminDb
      .from("transactions")
      .update({
        amount,
        date,
        description: transferDescription,
        account_id: from_account_id,
      })
      .eq("id", expenseTransaction.id)

    if (expenseError) throw expenseError

    const { error: incomeError } = await adminDb
      .from("transactions")
      .update({
        amount,
        date,
        description: transferDescription,
        account_id: to_account_id,
      })
      .eq("id", incomeTransaction.id)

    if (incomeError) throw incomeError

    const accountsToUpdate = new Set<string>([
      expenseTransaction.account_id,
      incomeTransaction.account_id,
      from_account_id,
      to_account_id,
    ])

    for (const accountId of accountsToUpdate) {
      if (accountId) {
        await recalculateAccountBalance(adminDb, accountId)
      }
    }

    const fromAccount = accounts.find((acc) => acc.id === from_account_id)
    const toAccount = accounts.find((acc) => acc.id === to_account_id)

    return NextResponse.json({
      transaction: {
        id,
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
          fromAccount: fromAccount
            ? { id: fromAccount.id, name: fromAccount.name, icon: fromAccount.icon }
            : null,
          toAccount: toAccount
            ? { id: toAccount.id, name: toAccount.name, icon: toAccount.icon }
            : null,
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminDb = createAdminClient()
    const { id } = await params

    const { data: profile } = await adminDb
      .from("profiles")
      .select("couple_id")
      .eq("id", payload.userId)
      .single()

    if (!profile?.couple_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { data: transferTransactions } = await adminDb
      .from("transactions")
      .select("id, account_id")
      .eq("couple_id", profile.couple_id)
      .like("description", `${TRANSFER_PREFIX}${id}::%`)

    if (!transferTransactions || transferTransactions.length === 0) {
      return NextResponse.json(
        { error: "Transferência não encontrada" },
        { status: 404 }
      )
    }

    const { error } = await adminDb
      .from("transactions")
      .delete()
      .in(
        "id",
        transferTransactions.map((transaction) => transaction.id)
      )

    if (error) throw error

    const accountsToUpdate = new Set(
      transferTransactions
        .map((transaction) => transaction.account_id)
        .filter(Boolean)
    )

    for (const accountId of accountsToUpdate) {
      if (accountId) {
        await recalculateAccountBalance(adminDb, accountId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
