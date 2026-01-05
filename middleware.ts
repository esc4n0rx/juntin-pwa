import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register')
    const isPublicPage = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/invite')

    // If trying to access app and no token, redirect to login
    if (request.nextUrl.pathname.startsWith('/app') && !token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If trying to access login/register and has token, redirect to app (optional, splash handles this too)
    if (isAuthPage && token) {
        // Let splash handle checking validity, or just redirect
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/app/:path*',
        '/login',
        '/register',
    ],
}
