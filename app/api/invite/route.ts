import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { cookies } from "next/headers";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get('auth_token')?.value;
        if (!tokenCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(tokenCookie);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = payload.userId;
        const adminDb = createAdminClient();

        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 })
        }

        // 1. Create Invite Record
        const token = crypto.randomUUID();

        const { data: invite, error: insertError } = await adminDb
            .from('couple_invites')
            .insert({
                email,
                token,
                sender_id: userId,
                status: 'pending'
            })
            .select()
            .single()

        if (insertError) {
            console.error("Invite Insert Error:", insertError)
            throw new Error(insertError.message)
        }

        // 2. Get Sender Profile
        const { data: profile } = await adminDb
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single()

        const senderName = profile?.full_name || 'Alguém'

        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const inviteUrl = `${origin}/invite/confirm?token=${token}`

        // 3. Send Email
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'Juntin <onboarding@resend.dev>',
            to: email,
            subject: `${senderName} te convidou para o Juntin`,
            html: `
        <h1>Convite para o Juntin</h1>
        <p>Olá!</p>
        <p>${senderName} te convidou para gerenciar as finanças em casal no Juntin.</p>
        <p>Clique no link abaixo para aceitar:</p>
        <a href="${inviteUrl}">Aceitar Convite</a>
        <br/>
        <p>Ou acesse: ${inviteUrl}</p>
      `,
        })

        if (emailError) {
            console.error("Resend Error:", emailError)
            return NextResponse.json({ error: emailError }, { status: 500 })
        }

        return NextResponse.json({ data: invite })

    } catch (err: any) {
        console.error("Invite API Error:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
