import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"
import { adminAuthMiddleware } from "@/lib/middleware/admin-auth"

export default async function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname
  const { pathname } = request.nextUrl

  // Domain Enforcement
  if (process.env.NODE_ENV === "production") {
    if (hostname !== "admin.binapex.my") {
      console.warn(`[Admin Proxy] Unauthorized domain: ${hostname}. Rejecting access.`)
      return new NextResponse('Domain Not Found', { status: 404 })
    }
  }

  // Update session for all requests
  const sessionResponse = await updateSession(request)

  // Apply admin auth to all /admin routes except login
  // Also protect API routes under /api/admin
  if ((pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) ||
      pathname.startsWith('/api/admin')) {
    return await adminAuthMiddleware(request)
  }

  return sessionResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
