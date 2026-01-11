"use server"

import { createClient } from "@/lib/supabase/server"

export async function getExchangeRate(pair: string = "USD-MYR") {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("system_settings")
    .select("value, updated_at")
    .eq("key", "myr_exchange_rate")
    .single()

  if (error) {
    return { rate: 0, lastUpdated: null }
  }

  return { rate: Number(data.value), lastUpdated: data.updated_at }
}
