import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client with Service Role privileges.
 * Use ONLY in server-side contexts for background jobs (Cron, Webhooks).
 * NEVER expose to the client.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key"

  return createClient(supabaseUrl, supabaseServiceKey, {

    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
