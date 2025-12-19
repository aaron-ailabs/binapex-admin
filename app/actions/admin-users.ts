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

    // Filter allowed fields to prevent arbitrary updates?
    // For now, trust the admin inputs but sanitize in a real app.
    // Ensure we don't accidentally update 'id' or system fields if passed.
    const { id, created_at, ...updateData } = data

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)

    if (error) throw new Error(error.message)

    // Log action
    await supabase.from("audit_logs").insert({
      action: "updated_user",
      admin_user: adminUser.id,
      target_user: userId,
      details: { changes: updateData },
      ip_address: "system" // Capture IP if possible or leave null
    })

    revalidatePath("/admin/users/[id]", "page") // Refresh Detail
    revalidatePath("/admin/users") // Refresh List
    return { success: true }
  } catch (error: any) {
    console.error("updateUserProfile error:", error)
    return { success: false, error: error.message }
  }
}

export async function creditUserBonus(userId: string, amount: number) {
  try {
    const { supabase, user: adminUser } = await verifyAdmin()

    // Get current bonus
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("bonus_balance")
      .eq("id", userId)
      .single()
    
    if (fetchError) throw new Error("User not found")

    const newBonus = (Number(profile.bonus_balance) || 0) + Number(amount)

    const { error } = await supabase
      .from("profiles")
      .update({ bonus_balance: newBonus })
      .eq("id", userId)

    if (error) throw new Error(error.message)

    // Log action
    await supabase.from("audit_logs").insert({
      action: "credited_bonus",
      admin_user: adminUser.id,
      target_user: userId,
      details: { amount, new_balance: newBonus },
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
