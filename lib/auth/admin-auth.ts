/**
 * Standardized Admin Authorization Helper
 * SEC-FIX: Single source of truth for admin authentication
 */

import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

/**
 * Verify the current user is an admin
 * Throws if not authenticated or not an admin
 */
export async function verifyAdminAccess() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error("Unauthorized: Not authenticated")
    }

    // Check admin role via RPC (cached in middleware)
    const { data: role, error: roleError } = await supabase.rpc("get_user_role")

    if (roleError) {
      console.error("[Auth] Error fetching user role:", roleError)
      throw new Error("Failed to verify admin status")
    }

    if (role !== "admin") {
      throw new Error("Forbidden: Admin access required")
    }

    return { supabase, user, adminId: user.id }
  } catch (error) {
    // SEC-FIX: Don't expose internal error details
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Authentication failed")
  }
}

/**
 * Create an admin client with service role key
 * SEC-FIX: Properly wrapped to prevent key exposure
 */
export function createAdminClient() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration")
    }

    return createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  } catch (error) {
    // SEC-FIX: Never log the actual error which might contain keys
    console.error("[Auth] Failed to create admin client")
    throw new Error("Admin client creation failed")
  }
}

/**
 * Verify admin and return admin client
 * Combines authentication check with service role client creation
 */
export async function getAdminClient() {
  await verifyAdminAccess()
  return createAdminClient()
}
