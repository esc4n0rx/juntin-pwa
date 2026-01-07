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
        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('couple_id, mode')
            .eq('id', invite.sender_id)
            .single()

        let coupleId = senderProfile?.couple_id

        if (!coupleId) {
            const { data: newCouple, error: coupleError } = await supabase
                .from('couples')
                .insert([{ created_at: new Date().toISOString() }])
                .select()
                .single()

            if (coupleError) throw coupleError
            coupleId = newCouple.id

            await supabase
                .from('profiles')
                .update({ couple_id: coupleId })
                .eq('id', invite.sender_id)
        }

        await supabase
            .from('profiles')
            .update({
                couple_id: coupleId,
                mode: 'couple',
                setup: true 
            })
            .eq('id', user.id)

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
