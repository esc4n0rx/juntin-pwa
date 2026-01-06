import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
    try {
        const { data: domains, error } = await resend.domains.list();

        // Mask API key for security in response
        const apiKey = process.env.RESEND_API_KEY || '';
        const maskedKey = apiKey ? `${apiKey.substring(0, 5)}...` : 'MISSING';

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            apiKeyStatus: maskedKey,
            domainsResult: domains,
            domainsError: error,
            envVars: {
                RESEND_API_KEY_EXISTS: !!process.env.RESEND_API_KEY,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { to } = await request.json();
        const data = await resend.emails.send({
            from: 'Juntin <noreply@juntin.fun>',
            to: to || 'matheusxpcamper@gmail.com', // fallback to owner for safety
            subject: 'Debug Email Juntin',
            html: '<p>This is a test email to verify domain configuration.</p>'
        });
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}
