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

        const { data: invite, error: inviteError } = await adminDb
            .from('couple_invites')
            .select('*')
            .eq('sender_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (inviteError || !invite) {
            return NextResponse.json({ error: 'Nenhum convite pendente encontrado' }, { status: 404 });
        }

        const { data: profile } = await adminDb
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

        const senderName = profile?.full_name || 'Alguém';
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteUrl = `${origin}/invite/confirm?token=${invite.token}`;

        const emailResult = await resend.emails.send({
            from: 'Juntin <noreply@juntin.fun>',
            to: invite.email,
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
        });

        if (emailResult.error) {
            console.error("[Resend] Email send failed:", emailResult.error);
            return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            email: invite.email
        });

    } catch (err: any) {
        console.error("[ResendInviteAPI] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
