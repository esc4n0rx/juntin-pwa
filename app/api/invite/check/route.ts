import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
        return NextResponse.json({ error: 'Unauthorized or no email' }, { status: 401 })
    }

    try {
        const { data: invite, error: inviteError } = await supabase
            .from('couple_invites')
            .select('*')
            .eq('email', user.email)
            .eq('status', 'pending')
            .single()
        if (inviteError || !invite) {
            console.log(`[InviteCheck] No pending invite found for ${user.email}. Error: ${inviteError?.message}`)
            return NextResponse.json({ found: false })
        }
        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('couple_id, setup')
            .eq('id', invite.sender_id)
            .single()

        let coupleId = senderProfile?.couple_id
        let ownerSetup = senderProfile?.setup || false

        if (!coupleId) {
            const { data: newCouple, error: coupleError } = await supabase
                .from('couples')
                .insert([{ name: null }])
                .select()
                .single()

            if (coupleError) throw coupleError
            coupleId = newCouple.id
        }

        const { data: rpcResult, error: rpcError } = await supabase.rpc('claim_my_pending_invite')

        if (rpcError) {
            throw rpcError
        }
        if (rpcResult && rpcResult.success) {

            return NextResponse.json({
                found: true,
                success: true,
                redirect: ownerSetup ? '/app' : '/waiting-partner'
            })
        } else {
            return NextResponse.json({ found: false, message: rpcResult?.message })
        }

    } catch (err: any) {
        console.error("[InviteCheck] Error:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
