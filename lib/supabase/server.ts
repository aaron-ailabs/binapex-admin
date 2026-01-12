import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Server-side Supabase client
 * Important: Always create a new client within each function (don't use globals)
 */
export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

  return createServerClient(supabaseUrl, supabaseKey, {

    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // setAll called from Server Component - can be ignored with proxy
        }
      },
    },
    cookieOptions: {
      name: "sb",
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
}

export { createServerClient }
