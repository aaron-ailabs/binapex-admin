"use server"

import { createClient } from "@/lib/supabase/server"
import { PlatformBankAccount } from "@/lib/types/database"

export async function getPlatformBankAccounts(): Promise<PlatformBankAccount[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("platform_bank_accounts")
    .select("*")
    .eq("is_active", true)

  if (error) {
    console.error("Error fetching platform bank accounts:", error)
    return []
  }

  return data as PlatformBankAccount[]
}
