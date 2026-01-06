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

        // 1. Parse Full Payload
        const { income, frequency, partnerEmail, categories } = await request.json();

        if (!income) {
            return NextResponse.json({ error: 'Informe a renda' }, { status: 400 });
        }

        // 2. Ensure Couple Exists & Update Income
        let { data: profile } = await adminDb
            .from('profiles')
            .select('couple_id, full_name')
            .eq('id', userId)
            .single();

        let coupleId = profile?.couple_id;

        if (!coupleId) {
            // Create new Couple
            const { data: newCouple, error: coupleError } = await adminDb
                .from('couples')
                .insert([{
                    income_amount: income,
                    income_frequency: frequency
                }])
                .select()
                .single();

            if (coupleError || !newCouple) throw new Error("Erro ao criar grupo familiar");
            coupleId = newCouple.id;

            await adminDb.from('profiles').update({ couple_id: coupleId }).eq('id', userId);
        } else {
            // Update existing
            await adminDb
                .from('couples')
                .update({
                    income_amount: income,
                    income_frequency: frequency
                })
                .eq('id', coupleId);
        }

        // 3. Save Categories & Budgets (Bulk Insert)
        if (categories && categories.length > 0) {
            // Transform Zustand categories to DB format
            // Zustand: { id: string, name: string, icon: string, budget?: number }
            // DB: { name, icon, type: 'expense', budget_limit, couple_id }

            // Note: We are wiping/creating or appending? 
            // For onboarding, usually we just create new ones.
            // User may have selected default categories in UI, we should save then as custom for this couple?
            // Or if they are default, we just create "overrides"?
            // Simpler: Create COPIES of selected categories for this household.
            // "budget_schema.sql" logic: Categories can be system default (couple_id null) or custom.
            // If user defines a BUDGET, we MUST create a custom record or finding a way to link budget to system default.
            // My schema has `budget_limit` ON the category table. 
            // This means a system default category cannot have a custom budget per couple.
            // **Design Decision**: Onboarding categories will be saved as NEW entries linked to `couple_id`.

            const categoriesToInsert = categories.map((cat: any) => ({
                name: cat.name,
                icon: cat.icon,
                color: cat.color || '#64748b',
                type: 'expense', // Default to expense for now as UI shows 'gastos'
                budget_limit: cat.budget || 0,
                couple_id: coupleId
            }));

            const { error: catError } = await adminDb
                .from('categories')
                .insert(categoriesToInsert);

            if (catError) {
                console.error("Category Insert Error:", catError);
                // Continue, don't block flow, but log
            }
        }

        // 4. Update Profile Setup
        await adminDb.from('profiles').update({ setup: true }).eq('id', userId);

        // 5. Handle Invite
        if (partnerEmail) {
            const token = crypto.randomUUID();
            // Insert Invite
            await adminDb.from('couple_invites').insert({
                email: partnerEmail,
                token,
                sender_id: userId,
                status: 'pending',
                // couple_id could be added if schema allowed, but we use logic.
            });

            // Send Email
            const senderName = profile?.full_name || 'Alguém';
            const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const inviteUrl = `${origin}/invite/confirm?token=${token}`;

            const emailResult = await resend.emails.send({
                from: 'Juntin <noreply@juntin.fun>',
                to: partnerEmail,
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
                throw new Error(`Falha ao enviar convite: ${emailResult.error.message}`);
            }
        }

        return NextResponse.json({ success: true, redirect: '/app' });

    } catch (err: any) {
        console.error("[OnboardingAPI] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
