'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTrade(
  amount: number,
  symbol: string,
  direction: 'UP' | 'DOWN',
  duration: number,
  payoutRate: number
) {
  const supabase = await createClient()

  // 1. Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 2. Price Fetch (Mocked)
  const strikePrice = await fetchLivePrice(symbol)

  // 3. Execute Transaction
  const { data, error } = await supabase.rpc('execute_binary_trade', {
    p_user_id: user.id,
    p_amount: amount,
    p_asset_symbol: symbol,
    p_direction: direction,
    p_duration_seconds: duration,
    p_strike_price: strikePrice,
    p_payout_rate: payoutRate
  })

  // 4. Handle Result
  if (error) return { error: error.message }
  if (!data?.success) return { error: data?.error || 'Trade Failed' }

  return { success: true, order: data.order }
}

async function fetchLivePrice(symbol: string) {
  // TODO: Replace with Real API (e.g. Binance/CoinGecko)
  // Returning random price for demo around 100000
  return 98000 + Math.random() * 1000
}
