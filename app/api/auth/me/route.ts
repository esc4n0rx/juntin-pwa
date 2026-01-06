import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const payload = verifyToken(token);

        if (!payload || !payload.userId) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const adminDb = createAdminClient();

        // Find User and Profile
        const { data: user } = await adminDb
            .from('users')
            .select('id, email')
            .eq('id', payload.userId)
            .single();

        if (!user) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const { data: profile } = await adminDb
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        let coupleData = null;
        let partnerData = null;
        let pendingInvite = null;

        if (profile?.couple_id) {
            const { data: couple } = await adminDb
                .from('couples')
                .select('*')
                .eq('id', profile.couple_id)
                .single();
            coupleData = couple;

            // Fetch Partner
            const { data: partnerProfile } = await adminDb
                .from('profiles')
                .select('email, full_name, avatar_url')
                .eq('couple_id', profile.couple_id)
                .neq('id', user.id) // Exclude self
                .single();

            if (partnerProfile) {
                partnerData = {
                    email: partnerProfile.email,
                    name: partnerProfile.full_name,
                    avatar: partnerProfile.avatar_url
                };
            }
        }

        // Check for pending invites sent by this user
        if (profile?.mode === 'couple' && !partnerData) {
            const { data: invite } = await adminDb
                .from('couple_invites')
                .select('email, created_at')
                .eq('sender_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (invite) {
                pendingInvite = {
                    email: invite.email,
                    sentAt: invite.created_at
                };
            }
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: profile?.full_name,
                avatar: profile?.avatar_url,
                setup: profile?.setup,
                mode: profile?.mode,
                couple_id: profile?.couple_id,
                // Return couple income if exists, else 0
                income: coupleData?.income_amount || 0,
                incomeFrequency: coupleData?.income_frequency || 'monthly',
                partner: partnerData,
                pendingInvite: pendingInvite
            }
        });

    } catch (err: any) {
        console.error("[MeAPI] Error:", err);
        return NextResponse.json({ user: null }, { status: 401 });
    }
}
