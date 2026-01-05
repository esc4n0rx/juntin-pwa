import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function createInvite(email: string) {
    try {
        const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })

        const data = await res.json()

        if (!res.ok) {
            return { error: data.error || 'Failed to create invite' }
        }

        return { data }
    } catch (e: any) {
        return { error: e.message || 'Error connecting to server' }
    }
}

export async function getInviteByToken(token: string) {
    const { data, error } = await supabase
        .from('couple_invites')
        .select('*, sender:profiles!couple_invites_sender_id_fkey(full_name)')
        .eq('token', token)
        .single()

    return { data, error }
}

export async function acceptInvite(token: string) {
    const { data: invite, error: fetchError } = await getInviteByToken(token)
    if (fetchError || !invite) return { error: fetchError || new Error('Invite not found') }

    if (invite.status !== 'pending') return { error: new Error('Invite already used') }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    // Transaction-like logic (client-side is risky but requested structure implies this)
    // Ideally we use an RPC function for atomicity.
    // I will assume we might need an RPC function for strict correctness, but plain matching is OK for MVP.
    // Wait, if "Casal" setup involves creates a "couples" row.
    // If the sender invited, did they already create a couple?
    // The plan said: "Criar convite ... Status pending". "Ao acessar link ... Criar relacionamento".
    // So couple might be created NOW or by the sender previously?
    // "Quando o gerenciamento for em casal, os dados são compartilhados ... couple_id"

    // It's cleaner if the couple is created when the Invite is Accepted, OR when the Sender sends it.
    // If Sender sends it, they are waiting.
    // Let's assume Sender creates the invite and is in "waiting" state. They probably don't have a couple_id yet or have a placeholder?
    // "Caso 2: Dono do convite ainda não finalizou setup"

    // Let's create an RPC for accepting invite to ensure clean data.
    // But for now, client logic:

    // 1. Create Couple
    // 2. Update Sender Profile (couple_id)
    // 3. Update Receiver Profile (couple_id)
    // 4. Update Invite Status

    // This is too complex for client-side without transactions. I'll propose an RPC or API route.
    // `lib/api/invites.ts` will call an API route `/api/invite/accept` to handle this atomicity if possible, or just use Supabase RPC.

    // For now I'll stub the RPC call.
    /*
    const { error } = await supabase.rpc('accept_invite', { token_arg: token })
    */

    // Since I can't easily add RPC without SQL editor access (I just have a file), I'll try to do it via API route for safety.

    const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    })

    return await res.json()
}

export async function checkPendingInvite() {
    try {
        const res = await fetch('/api/invite/check', {
            method: 'POST',
        })

        const data = await res.json()

        if (!res.ok) {
            console.error("Check invite failed:", data)
            return { error: data }
        }

        return { data }
    } catch (e) {
        console.error(e)
        return { error: e }
    }
}
