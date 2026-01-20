import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
    )
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    cookies: {
      getAll() {
        if (typeof document !== "undefined") {
          return document.cookie
            .split(";")
            .map((cookie) => {
              const [name, ...rest] = cookie.trim().split("=")
              return { name, value: rest.join("=") }
            })
            .filter((cookie) => cookie.name)
        }
        return []
      },
      setAll(cookiesToSet) {
        if (typeof document !== "undefined") {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = `${name}=${value}; path=${options?.path || "/"}; max-age=${options?.maxAge || 31536000}; ${options?.sameSite ? `samesite=${options.sameSite}` : "samesite=lax"}`
          })
        }
      },
    },
    cookieOptions: {
      name: "sb",
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}
