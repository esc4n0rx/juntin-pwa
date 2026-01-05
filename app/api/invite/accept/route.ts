import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    try {
        // 1. Get Invite
        const { data: invite, error: inviteError } = await supabase
            .from('couple_invites')
            .select('*')
            .eq('token', token)
            .single()

        if (inviteError || !invite) {
            return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
        }

        if (invite.status !== 'pending') {
            return NextResponse.json({ error: 'Invite already used' }, { status: 400 })
        }

        // Optional: Verify email matches (skip for flexibility if user signs up with different email, but for security usually check)
        // if (invite.email !== user.email) return Error...

        // 2. Logic to link couple
        // Check if Sender already has a couple
        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('couple_id, mode')
            .eq('id', invite.sender_id)
            .single()

        let coupleId = senderProfile?.couple_id

        if (!coupleId) {
            // Create new couple
            const { data: newCouple, error: coupleError } = await supabase
                .from('couples')
                .insert([{ created_at: new Date().toISOString() }])
                .select()
                .single()

            if (coupleError) throw coupleError
            coupleId = newCouple.id

            // Update Sender
            await supabase
                .from('profiles')
                .update({ couple_id: coupleId })
                .eq('id', invite.sender_id)
        }

        // 3. Update Receiver (current user)
        await supabase
            .from('profiles')
            .update({
                couple_id: coupleId,
                mode: 'couple',
                setup: true // Assume setup is done or they will land on app
            })
            .eq('id', user.id)

        // 4. Update Invite
        await supabase
            .from('couple_invites')
            .update({ status: 'accepted', couple_id: coupleId })
            .eq('id', invite.id)

        return NextResponse.json({ success: true, coupleId })

    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
