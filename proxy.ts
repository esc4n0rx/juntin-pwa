import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    const token = request.cookies.get('auth_token')
    const pathname = request.nextUrl.pathname

    const isProtectedRoute = pathname.startsWith('/app') ||
                            pathname.startsWith('/select-mode') ||
                            pathname.startsWith('/onboarding') ||
                            pathname.startsWith('/waiting-partner')

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')

    if (isProtectedRoute && !token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isAuthPage && token) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/app/:path*',
        '/login',
        '/register',
        '/select-mode',
        '/onboarding/:path*',
        '/waiting-partner',
    ],
}
