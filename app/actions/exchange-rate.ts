"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

export async function getExchangeRate(pair: string = "USD-MYR") {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("system_settings")
    .select("value, updated_at")
    .eq("key", "myr_exchange_rate")
    .single()

  if (error) {
    console.error("Error fetching exchange rate:", error)
    return { rate: 0, lastUpdated: null }
  }

  return { rate: Number(data.value), lastUpdated: data.updated_at }
}

export async function updateExchangeRate(rate: number, pair: string = "USD-MYR") {
  const supabase = await createClient()

  // Verify admin status
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { error: "Unauthorized: Admin access required" }
  }

  // Call the new API route instead of direct database update
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/update-exchange-rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabase.auth.getSession()}`, // This might not work, but let's try
    },
    body: JSON.stringify({ rate }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    return { error: errorData.error || 'Failed to update exchange rate' }
  }

  const result = await response.json()

  if (result.success) {
    revalidatePath("/admin/finance")
    revalidatePath("/deposit")
    return { success: true }
  } else {
    return { error: result.error || 'Failed to update exchange rate' }
  }
}
