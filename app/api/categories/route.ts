import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminDb = createAdminClient();

        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        let query = adminDb.from('categories').select('*');

        if (profile?.couple_id) {
            query = query.or(`couple_id.is.null,couple_id.eq.${profile.couple_id}`);
        } else {
            query = query.is('couple_id', null);
        }

        const { data: categories, error } = await query;

        if (error) throw error;

        return NextResponse.json({ categories });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        const adminDb = createAdminClient();

        const { name, icon, color, type, budget_limit } = await request.json();

        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) {
            return NextResponse.json({ error: "Funcionalidade disponível apenas após configuração inicial" }, { status: 400 });
        }

        const { data: category, error } = await adminDb
            .from('categories')
            .insert({
                name,
                icon,
                color,
                type,
                budget_limit,
                couple_id: profile.couple_id
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ category });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        const { id } = await request.json();

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const adminDb = createAdminClient();

        const { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id')
            .eq('id', payload.userId)
            .single();

        if (!profile?.couple_id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const { error } = await adminDb
            .from('categories')
            .delete()
            .eq('id', id)
            .eq('couple_id', profile.couple_id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        const { id, name, icon, budget_limit } = await request.json();

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const adminDb = createAdminClient();
        const { data: profile } = await adminDb.from('profiles').select('couple_id').eq('id', payload.userId).single();

        if (!profile?.couple_id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (icon !== undefined) updates.icon = icon;
        if (budget_limit !== undefined) updates.budget_limit = budget_limit;

        const { data: category, error } = await adminDb
            .from('categories')
            .update(updates)
            .eq('id', id)
            .eq('couple_id', profile.couple_id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ category });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

