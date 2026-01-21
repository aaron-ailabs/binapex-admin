import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const adminStatusCache = new Map<string, { isAdmin: boolean; timestamp: number }>()
const ADMIN_CACHE_DURATION = 1 * 60 * 1000 // 1 minute

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    )
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
        console.log("[Middleware] User authenticated:", user.email)
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
        console.warn("[Middleware] Non-admin user attempted to access admin route:", user.email)
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        return redirectTo(request, "/admin/login")
      }

      console.log("[Middleware] Admin access verified at edge for:", user.email)
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
