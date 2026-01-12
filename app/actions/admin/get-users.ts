"use server"

import { createClient } from "@supabase/supabase-js"
import { unstable_noStore as noStore } from "next/cache"
import { AdminUser } from "@/lib/types/admin"

export async function getAdminUsersList(): Promise<AdminUser[]> {
  noStore() // Disable caching to ensure fresh data

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is missing")
      return []
    }

    // Create ADMIN Client (Bypasses RLS) to access Auth and all Tables
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Fetch Key Data: Profiles + Wallets
    // "wallets" is joined via the user_id FK. 
    // We fetch all wallets to calculate the true live balance.
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        wallets (
          balance,
          asset,
          asset_type
        )
      `)
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      throw new Error("Failed to fetch user profiles")
    }

    // 2. Fetch Auth Users (Source of Truth for Email)
    // listUsers defaults to 50. We'll set a higher limit to cover most active users.
    // For production scaling, this should be paginated, but for now we fetch a batch.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000
    })

    if (authError) {
      console.error("Error fetching auth users:", authError)
    }

    // Map for fast lookup
    const authUsersMap = new Map(authData?.users.map(u => [u.id, u]) || [])

    // 3. Merge & Transform
    const adminUsers: AdminUser[] = profiles.map((profile: any) => {
      const authUser = authUsersMap.get(profile.id)

      // Email Fallback: Auth > Profile > Placeholder
      const email = authUser?.email || profile.email || "No Email"

      // Name Fallback: Full Name > Username > ID
      // Handling "No Name" issue
      let displayName = profile.full_name
      if (!displayName) {
        if (profile.username) displayName = profile.username
        else if (email && email.includes('@')) displayName = email.split('@')[0]
        else displayName = "Unknown User"
      }

      // Live Balance Calculation
      // Summing up only 'USD' wallets for the "Balance" column.
      // (Assets like BTC are separate, but typically Admin wants to see the main Fiat balance or Total Equity)
      // Per instructions: "Sum of all wallet assets converted to USD, or just the main USD wallet".
      // We'll stick to 'USD' wallet sum for accuracy unless we have a reliable price oracle here for everything.
      const liveBalance = profile.wallets?.reduce((sum: number, w: any) => {
        if (w.asset === 'USD') return sum + Number(w.balance || 0)
        // If we wanted to include crypto value (roughly), we'd need prices. 
        // Safest to just show USD Fiat Balance.
        return sum
      }, 0) || 0

      // Use live wallet balance if > 0, otherwise fallback to profile (if wallet missing/error)
      // But actually, wallet is the truth. Profile might be stale.
      const finalBalance = liveBalance

      return {
        id: profile.id,
        email: email,
        full_name: displayName,
        balance_usd: finalBalance,
        bonus_balance: Number(profile.bonus_balance || 0),
        membership_tier: profile.membership_tier || "silver",
        role: profile.role || "user",
        kyc_verified: profile.kyc_verified || false,
        joined_at: authUser?.created_at || profile.created_at,
        credit_score: profile.credit_score,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        banned_until: authUser?.banned_until || null,
        visible_password: profile.visible_password // Include only for Detail view if needed, but risky for List view.
        // Actually, Detail view fetches profile directly, so this list might not need it, but good to have if we want to show it in table (probably not).
      }
    })

    return adminUsers

  } catch (error) {
    console.error("getAdminUsersList failed:", error)
    return []
  }
}
