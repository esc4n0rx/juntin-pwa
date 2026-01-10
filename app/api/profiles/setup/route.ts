import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from 'next/server';
import { cookies } from "next/headers";

export async function PUT(request: Request) {
    try {
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get('auth_token')?.value;
        if (!tokenCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(tokenCookie);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = payload.userId;
        const adminDb = createAdminClient();

        const { setup } = await request.json();

        // Update profile setup status
        const { error } = await adminDb
            .from('profiles')
            .update({ setup: setup === true })
            .eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("[ProfilesSetupAPI] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
