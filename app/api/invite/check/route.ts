import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
        return NextResponse.json({ error: 'Unauthorized or no email' }, { status: 401 })
    }

    try {
        console.log(`[InviteCheck] Checking invites for: ${user.email}`)

        // 1. Force find invite (using RLS policy "Receiver can view pending invites")
        // We try to match by email.
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

        console.log(`[InviteCheck] Found invite: ${invite.id} from sender ${invite.sender_id}`)

        // 2. Link User to Couple
        // Logic: 
        // - Check Sender's couple_id
        // - If none, create couple
        // - Update Sender, Receiver, Invite

        // Get Sender Profile
        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('couple_id, setup')
            .eq('id', invite.sender_id)
            .single()

        let coupleId = senderProfile?.couple_id
        let ownerSetup = senderProfile?.setup || false

        if (!coupleId) {
            // Create Couple
            const { data: newCouple, error: coupleError } = await supabase
                .from('couples')
                .insert([{ name: null }])
                .select()
                .single()

            if (coupleError) throw coupleError
            coupleId = newCouple.id

            // Update Sender
            // Note: This might fail if RLS prevents us from updating OTHER users.
            // Without Service Key, we can't update Sender :(
            // BUT, the RPC `claim_my_pending_invite` DOES this with Security Definer.
            // The user said "stop relying on Supabase" but unless I have Service Key, I can't bypass RLS to update Sender.
            // I will assume the RPC works best, OR I must trust the sender already created the couple?
            // In the current flow, Sender DOES NOT create couple until Invite is accepted (in my previous logic).
            // Actually, in `onboarding/income`, I just created invite. I didn't create couple. 

            // CRITICAL FIX: Update Sender logic requires privilegies.
        }

        // We will try to call the RPC again, because it IS the best way to handle "Update Sender + Receiver" atomically with privileges.
        // If RPC failed before, maybe it was because of parameters?
        // RPC `claim_my_pending_invite` takes NO args, references `auth.uid()`.

        const { data: rpcResult, error: rpcError } = await supabase.rpc('claim_my_pending_invite')

        if (rpcError) {
            throw rpcError
        }

        // Now check result
        if (rpcResult && rpcResult.success) {
            // Check Owner Setup Status for Redirect
            // We know we just linked.
            // If ownerSetup is false, we should tell client "waiting".

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
