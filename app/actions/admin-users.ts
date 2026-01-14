"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Helper to verify if the current user is an admin.
 * Throws an error if not authorized.
 */
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized: not authenticated")
  }

  // 1. Check RPC (if available)
  const { data: rpcRole } = await supabase.rpc("get_user_role")
  if (rpcRole === "admin") return { supabase, user }

  // 2. Check Profile directly (Fallback)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role === "admin") return { supabase, user }

  throw new Error("Unauthorized: Admin access required")
}

export async function updateUserProfile(userId: string, data: any) {
  try {
    const { supabase, user: adminUser } = await verifyAdmin()

    // Filter allowed fields to prevent arbitrary updates
    const { id, created_at, visible_password, ...updateData } = data

    // SEC-02: Plaintext Password Exposure - Removed sync logic and storage
    // Admins should use standard password reset flows instead of viewing plaintext passwords.

    // Unified Balance Logic: Handle wallet update if balance is provided
    if ('balance_usd' in updateData) {
      const { balance_usd, ...rest } = updateData

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: balance_usd })
        .eq("user_id", userId)
        .eq("asset", "USD")

      if (walletError) throw new Error(walletError.message)

      // Update profile with remaining data (and reset legacy balance_usd to 0 just in case)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ ...rest, balance_usd: 0 })
        .eq("id", userId)

      if (profileError) throw new Error(profileError.message)
    } else {
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId)

      if (error) throw new Error(error.message)
    }

    // Log action
    await supabase.from("audit_logs").insert({
      action: "updated_user",
      admin_user: adminUser.id,
      target_user: userId,
      details: { changes: updateData },
      ip_address: "system"
    })

    revalidatePath("/admin/users/[id]", "page")
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error: any) {
    console.error("updateUserProfile error:", error)
    return { success: false, error: error.message }
  }
}

export async function creditUserBonus(userId: string, amount: number) {
  try {
    const { supabase, user: adminUser } = await verifyAdmin()

    // PERF-03: Using atomic RPC to avoid race conditions
    const { error } = await supabase.rpc("credit_user_balance", {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'bonus'
    })

    if (error) throw new Error(error.message)

    // Log action
    await supabase.from("audit_logs").insert({
      action: "credited_bonus",
      admin_user: adminUser.id,
      target_user: userId,
      details: { amount },
      ip_address: "system"
    })

    revalidatePath("/admin/users/[id]", "page")
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error: any) {
    console.error("creditUserBonus error:", error)
    return { success: false, error: error.message }
  }
}
