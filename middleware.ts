import { type NextRequest, NextResponse } from 'next/server';
import { adminAuthMiddleware } from '@/lib/middleware/admin-auth';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Apply admin auth to all /admin routes except login
    // Also protect API routes under /api/admin
    if ((pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) ||
        pathname.startsWith('/api/admin')) {
        return await adminAuthMiddleware(request);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/api/admin/:path*'
    ],
};
