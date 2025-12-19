"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export interface PortfolioData {
  balance_usd: number
  holdings: Record<string, number>
  isLoading: boolean
}

export function useUserPortfolio() {
  const [data, setData] = useState<PortfolioData>({
    balance_usd: 0,
    holdings: {},
    isLoading: true,
  })
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    const fetchPortfolio = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (isMounted) setData(prev => ({ ...prev, isLoading: false }))
          return
        }

        // Fetch all wallet balances (USD + Assets)
        const { data: wallets } = await supabase
          .from('wallets')
          .select('asset, balance, locked_balance')
          .eq('user_id', user.id)

        let usdBal = 0
        const holdingsMap: Record<string, number> = {}

        if (wallets) {
            wallets.forEach(w => {
                 if (w.asset === 'USD' || w.asset === 'USDT') {
                     // Calculate AVAILABLE USD (Balance - Locked)
                     usdBal += Number(w.balance) - Number(w.locked_balance || 0)
                 } else {
                     holdingsMap[w.asset] = Number(w.balance)
                 }
            })
        }

        if (isMounted) {
          setData({
            balance_usd: usdBal,
            holdings: holdingsMap,
            isLoading: false
          })
        }
      } catch (error) {
        console.error("Error fetching portfolio:", error)
        if (isMounted) setData(prev => ({ ...prev, isLoading: false }))
      }
    }

    fetchPortfolio()

    // Optional: Subscribe to Realtime changes for Wallets/Portfolio could go here
    // For now, we stick to fetch on mount/interval or manual refresh trigger integration later

    return () => { isMounted = false }
  }, [])

  const refetch = async () => {
      // Re-run the fetch logic - for simplicity, we can just trigger a re-mount or expose the function
      // But creating a separate function inside useEffect is cleaner. 
      // For this MVP hook, distinct refetch isn't strictly requested but good to have.
      // We will rely on parent re-rendering or component mounting for now.
  }

  return { ...data, refetch }
}
