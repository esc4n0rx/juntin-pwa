import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword, signToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const { email, password, name } = await request.json();
        const adminDb = createAdminClient();

        // 1. Check if user exists
        const { data: existingUser } = await adminDb
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
        }

        // 2. Create User
        const hashedPassword = await hashPassword(password);

        const { data: newUser, error: createError } = await adminDb
            .from('users')
            .insert([{
                email,
                password_hash: hashedPassword
            }])
            .select()
            .single();

        if (createError || !newUser) {
            throw new Error(createError?.message || "Erro ao criar usuário");
        }

        const userId = newUser.id;

        // 3. Create Profile
        await adminDb.from('profiles').insert({
            id: userId,
            email: email,
            full_name: name,
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
            setup: false
        });

        // 4. Create Session with 30 days expiration for PWA
        const token = signToken({ userId: userId, email: email });
        const cookieStore = await cookies();
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30, // 30 days for PWA
            path: '/',
            sameSite: 'lax'
        });

        // 5. Check for Invites
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
                // Sender has no couple?? This shouldn't happen if they finished setup correctly.
                // But if they didn't finish, we might create one now.
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

            // Also update sender to ensure they are in couple mode (if they were waiting)
            await adminDb.from('profiles').update({
                mode: 'couple'
            }).eq('id', invite.sender_id);

            await adminDb.from('couple_invites').update({ status: 'accepted', couple_id: coupleId }).eq('id', invite.id);

            return NextResponse.json({
                success: true,
                redirect: '/app' // Always go to app if linked
            });

        } else {
            return NextResponse.json({ success: true, redirect: '/select-mode' });
        }

    } catch (err: any) {
        console.error("[RegisterAPI] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
