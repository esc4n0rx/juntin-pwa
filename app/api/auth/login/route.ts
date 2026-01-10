import { createAdminClient } from "@/lib/supabase/admin";
import { signToken, verifyPassword } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();
        const adminDb = createAdminClient();

        // 1. Find User by Email
        // Using adminDb to query public.users
        const { data: users, error: userError } = await adminDb
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError || !users) {
            return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
        }

        const user = users;

        // 2. Verify Password
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
            return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
        }

        // 3. Create Session Token
        const token = signToken({ userId: user.id, email: user.email });

        // Set Cookie with 30 days expiration for PWA
        const cookieStore = await cookies();
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30, // 30 days for PWA
            path: '/',
            sameSite: 'lax'
        });

        // 4. Invite & Redirect Logic
        const userId = user.id;

        // Check for Pending Invites
        const { data: invites } = await adminDb
            .from('couple_invites')
            .select('*')
            .ilike('email', email)
            .eq('status', 'pending');

        const invite = invites && invites.length > 0 ? invites[0] : null;

        if (invite) {
            // Accept Invite Logic
            const { data: senderProfile } = await adminDb
                .from('profiles')
                .select('couple_id, setup')
                .eq('id', invite.sender_id)
                .single();

            let coupleId = senderProfile?.couple_id;
            const ownerSetup = senderProfile?.setup;

            if (!coupleId) {
                const { data: newCouple } = await adminDb
                    .from('couples')
                    .insert([{ name: null }])
                    .select()
                    .single();
                coupleId = newCouple?.id;

                await adminDb.from('profiles').update({ couple_id: coupleId }).eq('id', invite.sender_id);
            }

            await adminDb.from('profiles').update({
                couple_id: coupleId,
                mode: 'couple',
                setup: true
            }).eq('id', userId);

            await adminDb.from('couple_invites').update({ status: 'accepted', couple_id: coupleId }).eq('id', invite.id);

            return NextResponse.json({
                success: true,
                redirect: ownerSetup ? '/app' : '/waiting-partner'
            });
        }

        // Normal Flow (No invite)
        const { data: profile } = await adminDb
            .from('profiles')
            .select('setup, mode, couple_id')
            .eq('id', userId)
            .single();

        // Se setup está completo, vai para /app
        if (profile?.setup === true) {
            if (profile.mode === 'couple' && profile.couple_id) {
                const { data: partner } = await adminDb
                    .from('profiles')
                    .select('setup')
                    .eq('couple_id', profile.couple_id)
                    .neq('id', userId)
                    .single();

                if (partner && !partner.setup) {
                    return NextResponse.json({ success: true, redirect: '/waiting-partner' });
                }
            }
            return NextResponse.json({ success: true, redirect: '/app' });
        } else {
            // Se setup não está completo, vai para select-mode
            return NextResponse.json({ success: true, redirect: '/select-mode' });
        }

    } catch (err: any) {
        console.error("[LoginAPI] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
