import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { rateLimitMiddleware } from "@/lib/middleware/rate-limit"

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const adminStatusCache = new Map<string, { isAdmin: boolean; timestamp: number }>()
const ADMIN_CACHE_DURATION = 1 * 60 * 1000 // 1 minute


export async function updateSession(request: NextRequest) {
  const supabaseUrl = NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
  const supabaseAnonKey = NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  const { supabase, response } = createClient(request, supabaseUrl, supabaseAnonKey)

  try {
    const pathname = request.nextUrl.pathname

    // Skip auth check for public assets and static files
    // This addresses Issue 1: "Repeated supabase.auth.getUser() calls"
    if (isStaticAsset(pathname)) {
      return response
    }

    console.log("[Middleware] Processing request:", pathname)

    // SEC-FIX: Apply rate limiting to admin and API routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      // More aggressive rate limiting for login endpoint (5 attempts per minute)
      const limit = pathname === "/admin/login" ? 5 : 60
      const windowMs = 60000 // 1 minute

      const rateLimitResult = rateLimitMiddleware(request, limit, windowMs)
      if (rateLimitResult) {
        return rateLimitResult
      }
    }

    // Determine if we need to authenticate the user
    // We only need auth if it's a protected route (or an auth route to redirect away)
    const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/api")
    const isAuthPage = pathname === "/admin/login"

    let user = null

    // Optimizing auth calls: only fetch user if necessary
    if (isProtected || isAuthPage) {
      const { data } = await supabase.auth.getUser()
      user = data.user

      if (user) {
        // SEC-FIX: Removed PII logging - do not log user emails
        console.log("[Middleware] User authenticated")
      }
    }

    // Apply Routing Logic - Addresses Issue 3 "God Function" by separating concerns

    // 1. Admin Route Protection
    if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && pathname !== "/admin/login" && pathname !== "/admin/setup") {
      if (!user) {
        console.log("[Middleware] Admin route accessed without authentication, redirecting to login")
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        return redirectTo(request, "/admin/login")
      }

      // SEC-03: Implement Edge RBAC check using cache to avoid excessive DB calls
      const cacheKey = user.id
      const cachedStatus = adminStatusCache.get(cacheKey)
      const now = Date.now()

      let isAdmin = false

      if (cachedStatus && (now - cachedStatus.timestamp) < ADMIN_CACHE_DURATION) {
        isAdmin = cachedStatus.isAdmin
      } else {
        // Fetch role from DB
        const { data: role } = await supabase.rpc("get_user_role")
        isAdmin = role === "admin"

        // Update cache
        adminStatusCache.set(cacheKey, { isAdmin, timestamp: now })
      }

      if (!isAdmin) {
        // SEC-FIX: Removed PII logging - do not log user emails
        console.warn("[Middleware] Non-admin user attempted to access admin route")
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        return redirectTo(request, "/admin/login")
      }

      // SEC-FIX: Removed PII logging - do not log user emails
      console.log("[Middleware] Admin access verified at edge")
    }

  } catch (error) {
    console.error("[Middleware] Auth error:", error)
  }

  return response
}

function createClient(request: NextRequest, supabaseUrl: string, supabaseAnonKey: string) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
    cookieOptions: {
      name: "sb",
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })

  return { supabase, response }
}

function isStaticAsset(pathname: string) {
  if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
    return true
  }

  // Check for common static file extensions
  const staticExtensions = [".ico", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".css", ".js", ".woff", ".woff2", ".ttf"]
  return staticExtensions.some(ext => pathname.toLowerCase().endsWith(ext))
}

function redirectTo(request: NextRequest, path: string) {
  const url = request.nextUrl.clone()
  url.pathname = path
  return NextResponse.redirect(url)
}
