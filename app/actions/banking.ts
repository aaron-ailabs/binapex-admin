'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const depositSchema = z.object({
  amount: z.number().min(50).max(1000000),
  receipt_url: z.string().min(1, "Receipt is required"),
  platform_bank_account_id: z.string().uuid().optional(),
})

// Update schema to match new requirements
const withdrawalSchema = z.object({
  amount: z.number().min(50).max(1000000),
  method: z.enum(["BANK", "EWALLET"]),
  payout_details: z.object({
    bank_name: z.string().optional(),
    account_number: z.string().optional(),
    account_name: z.string().optional(),
    wallet_provider: z.string().optional(),
    wallet_id: z.string().optional()
  }),
  withdrawal_password: z.string().min(1, "Withdrawal password is required"),
})

export async function submitWithdrawal(data: {
  amount: number
  method: "BANK" | "EWALLET"
  payout_details: any
  withdrawal_password: string
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

  try {
    // 2. Calculate Amounts for RPC
    const EXCHANGE_RATE = 4.45
    const amount_myr = validation.data.amount * EXCHANGE_RATE

    // 3. Call Atomic RPC
    const { data: result, error: rpcError } = await supabase.rpc("request_new_withdrawal", {
      p_amount_usd: validation.data.amount,
      p_amount_myr: amount_myr,
      p_method: validation.data.method,
      p_payout_details: validation.data.payout_details,
      p_password: validation.data.withdrawal_password
    })

    if (rpcError) {
      throw new Error(rpcError.message)
    }

    revalidatePath("/withdrawal")
    revalidatePath("/history")
    revalidatePath("/admin/withdrawals") // Useful for admin testing
    return { success: true }
  } catch (error: any) {
    console.error("Withdrawal processing error:", error)
    return { error: error.message }
  }
}

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

  try {
    const { data: result, error: rpcError } = await supabase.rpc("request_new_deposit", {
      p_amount: validation.data.amount,
      p_receipt_url: validation.data.receipt_url,
      p_bank_id: validation.data.platform_bank_account_id
    })

    if (rpcError) {
      throw new Error(rpcError.message)
    }

    revalidatePath("/history")
    revalidatePath("/admin/deposits")
    return { success: true }
  } catch (error: any) {
    console.error("Deposit processing error:", error)
    return { error: error.message }
  }
}
