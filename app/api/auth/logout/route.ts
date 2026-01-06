import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Clear the auth token cookie
        cookieStore.delete('auth_token');

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[LogoutAPI] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
