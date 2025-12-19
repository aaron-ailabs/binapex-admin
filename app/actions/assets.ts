'use server'

import { createClient } from '@/lib/supabase/server'

export async function getAvailableAssets() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('assets')
    .select('id, symbol, name, category, payout_rate, yahoo_ticker')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('symbol', { ascending: true })

  if (error) {
    console.error('Error fetching assets:', error)
    return []
  }

  return data
}
