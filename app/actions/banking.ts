'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const depositSchema = z.object({
  amount: z.number().min(50).max(1000000),
  receipt_url: z.string().min(1, "Receipt is required"),
  platform_bank_account_id: z.string().uuid().optional(),
})

const withdrawalSchema = z.object({
  amount: z.number().min(50).max(1000000),
  user_bank_account_id: z.string().uuid(),
})

const bankAccountSchema = z.object({
  bank_name: z.string().min(2),
  account_name: z.string().min(2),
  account_number: z.string().regex(/^[0-9]+$/, "Must contain only digits").min(6).max(20),
})

export async function submitDeposit(data: {
  amount: number
  receipt_url: string
  platform_bank_account_id?: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Unauthorized" }
  }

  const validation = depositSchema.safeParse(data)

  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: validation.data.amount,
    currency: "USD",
    status: "pending",
    type: "deposit",
    receipt_url: validation.data.receipt_url,
    metadata: {
        platform_bank_account_id: validation.data.platform_bank_account_id || null
    }
  })

  if (error) {
    console.error("Deposit error:", error)
    return { error: error.message }
  }

  revalidatePath("/deposit")
  revalidatePath("/history")
  return { success: true }
}

export async function submitWithdrawal(data: {
  amount: number
  user_bank_account_id: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Unauthorized" }
  }

  const validation = withdrawalSchema.safeParse(data)

  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  // Fetch bank details first
  const { data: bankAccount, error: bankError } = await supabase
    .from("user_bank_accounts")
    .select("bank_name, account_name, account_number")
    .eq("id", validation.data.user_bank_account_id)
    .single()

  if (bankError || !bankAccount) {
    return { error: "Bank account not found" }
  }

  // Atomic withdrawal request via RPC
  const { error: rpcError } = await supabase.rpc("request_withdrawal", {
    amount: validation.data.amount,
    bank_details: bankAccount
  })

  // Handle network/RPC errors
  if (rpcError) {
      console.error("Withdrawal RPC error:", rpcError)
      return { error: rpcError.message }
  }

  revalidatePath("/withdrawal")
  revalidatePath("/history")
  return { success: true }
}

export async function addUserBankAccount(data: {
  bank_name: string
  account_name: string
  account_number: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Unauthorized" }
  }

  const validation = bankAccountSchema.safeParse(data)

  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  // Check if it's the first account, if so make it primary
  const { count } = await supabase
    .from("user_bank_accounts")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id)

  const is_primary = count === 0

  const { error } = await supabase.from("user_bank_accounts").insert({
    user_id: user.id,
    bank_name: validation.data.bank_name,
    account_name: validation.data.account_name,
    account_number: validation.data.account_number,
    is_primary
  })

  if (error) {
    console.error("Add bank error:", error)
    return { error: error.message }
  }

  revalidatePath("/withdrawal")
  return { success: true }
}

export async function deleteUserBankAccount(bankId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Unauthorized" }
  }

  const { error } = await supabase
    .from("user_bank_accounts")
    .delete()
    .eq("id", bankId)
    .eq("user_id", user.id) // Security check via RLS, but explicit is good too

  if (error) {
    console.error("Delete bank error:", error)
    return { error: error.message }
  }

  revalidatePath("/withdrawal")
  return { success: true }
}
