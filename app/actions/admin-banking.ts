'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const platformBankSchema = z.object({
  bank_name: z.string().min(2),
  account_name: z.string().min(2),
  account_number: z.string().min(6),
  is_active: z.boolean().default(true),
})

// Helper to verify admin access
async function verifyAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return { error: "Forbidden: Admin only" }
  }

  return { success: true }
}

export async function addPlatformBankAccount(data: {
  bank_name: string
  account_name: string
  account_number: string
}) {
  const supabase = await createClient()
  const authCheck = await verifyAdmin(supabase)
  if (authCheck.error) return { error: authCheck.error }

  const validation = platformBankSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  const { error } = await supabase.from("platform_bank_accounts").insert(validation.data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/finance")
  return { success: true }
}

export async function togglePlatformBankAccount(id: string, isActive: boolean) {
  const supabase = await createClient()
  const authCheck = await verifyAdmin(supabase)
  if (authCheck.error) return { error: authCheck.error }

  const { error } = await supabase
    .from("platform_bank_accounts")
    .update({ is_active: isActive })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/admin/finance")
  return { success: true }
}

export async function deletePlatformBankAccount(id: string) {
    const supabase = await createClient()
    const authCheck = await verifyAdmin(supabase)
    if (authCheck.error) return { error: authCheck.error }
  
    const { error } = await supabase
      .from("platform_bank_accounts")
      .delete()
      .eq("id", id)
  
    if (error) return { error: error.message }
  
    revalidatePath("/admin/finance")
    return { success: true }
  }

export async function revalidateBanks() {
    revalidatePath("/admin/finance")
    return { success: true }
  }
