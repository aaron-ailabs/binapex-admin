

"use client"


import { useState, useEffect } from "react"
  // Use the new hook for data
  import { useMarketData } from '@/hooks/useMarketData' 
  // Note: I need to add this import to the top of file, but I cannot do it in this block easily.
  // Instead, I will replace the component logic.
  
  // Actually, wait. I can't import in the middle of a file with replace_file_content properly if it's not a block replacement.
  // I should rewrite the component start to include the import and the hook usage.
import { OrderFormWidget } from "./order-form-widget"
import { OrderBook } from "./order-book"
import { UserDashboard } from "./user-dashboard"
import { MarketWidget } from "./market-widget"
import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useMarketData } from "@/hooks/useMarketData"

// Dynamic import to avoid SSR issues with lightweight-charts
const CandlestickChart = dynamic(
  () => import('./candlestick-chart').then(mod => mod.CandlestickChart),
  { ssr: false }
)

import { Tables } from "@/types/supabase"

interface AssetInfo {
  symbol: string
  price?: number
  rate?: number
  change_pct?: number
  // Add other fields as needed from the python API response
    [key: string]: any // Fallback for now as python API isn't fully typed here, but better than full any
}

interface DashboardData {
    stocks: Record<string, AssetInfo>
    forex: Record<string, AssetInfo>
    crypto: Record<string, AssetInfo>
    commodities: Record<string, AssetInfo>
}

import { useSearchParams } from 'next/navigation'

export function TradingInterface() {
  const searchParams = useSearchParams()
  const initialAsset = searchParams.get('asset')

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState(initialAsset || "BTC/USD")
  const [selectedCategory, setSelectedCategory] = useState("crypto")
  const [isLoading, setIsLoading] = useState(true)

  // Sync state if URL changes while mounted
  useEffect(() => {
    const asset = searchParams.get('asset')
    if (asset && asset !== selectedSymbol) {
        setSelectedSymbol(asset)
    }
  }, [searchParams])

  // 1. POLL DASHBOARD (For Asset Selector & Global State)
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/market/dashboard")
        if (res.ok) {
            const data = await res.json()
            setDashboardData(data)
        }
      } catch (e) {
        console.error("Dashboard fetch error:", e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
    const interval = setInterval(fetchDashboard, 5000)
    return () => clearInterval(interval)
  }, [])

  // 2. USE MARKET DATA HOOK (For Selected Asset)
  const { candles, currentPrice: hookPrice, change24h: hookChange } = useMarketData(selectedSymbol)

  const handleSelect = (symbol: string, category: string) => {
      setSelectedSymbol(symbol)
      setSelectedCategory(category)
  }

  if (isLoading && !dashboardData) {
      return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-[#F59E0B]" /></div>
  }
  
  const stocks = dashboardData?.stocks || {}
  const forex = dashboardData?.forex || {}
  const crypto = dashboardData?.crypto || {}
  const commodities = dashboardData?.commodities || {}
  
  // Priority: Hook Price > Dashboard Price > 0
  const currentAssetInfo = dashboardData 
    ? Object.values(dashboardData)
        .flatMap((cat) => Object.values(cat) as AssetInfo[])
        .find((asset) => asset.symbol === selectedSymbol) || null
    : null;

  const price = hookPrice > 0 ? hookPrice : (currentAssetInfo?.price || currentAssetInfo?.rate || 0)
  const changePct = hookChange !== 0 ? hookChange : (currentAssetInfo?.change_pct || 0)

  return (
    <div className="flex flex-col gap-4 p-4 min-h-screen bg-black text-gray-200 font-sans">
      
      {/* Top Details Bar */}
      <GlassCard className="p-4 flex justify-between items-center border-b-2 border-[#F59E0B] relative overflow-hidden">
          <div className="flex items-center gap-4">
              <div>
                  <h1 className="text-3xl font-bold text-white tracking-tighter leading-none">{selectedSymbol}</h1>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 lg:hidden">
                    {selectedCategory}
                  </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                  <Badge className="bg-[#F59E0B] text-black font-bold text-lg px-2 py-0 h-fit">
                      ${price.toFixed(price > 1000 ? 2 : 5)}
                  </Badge>
                  <span className={`text-sm font-mono font-bold ${ changePct >= 0 ? 'text-emerald-500' : 'text-red-500' }`}>
                      {changePct > 0 ? "+" : ""}
                      {(changePct * 100).toFixed(2)}%
                  </span>
              </div>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="text-xs text-gray-500 uppercase tracking-widest hidden lg:block">
                  BinPEX PRO TERMINAL // {selectedCategory}
              </div>
              {/* Mobile Asset Selector Trigger */}
              <button 
                onClick={() => document.getElementById('market-selection')?.scrollIntoView({ behavior: 'smooth' })}
                className="lg:hidden bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded text-xs font-bold text-[#F59E0B]"
              >
                SELECT ASSET
              </button>
          </div>
      </GlassCard>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-[600px]">
          {/* LEFT: Chart & Dashboard */}

          <div className="flex-1 flex flex-col gap-4 min-w-0">
             <GlassCard className="flex-1 min-h-[400px] p-1 overflow-hidden relative border border-white/5">
                 <CandlestickChart symbol={selectedSymbol} data={candles} />
             </GlassCard>
             <UserDashboard symbol={selectedSymbol} />
          </div>

          {/* RIGHT: Order Book & Entry */}
          <div className="w-full lg:w-[320px] flex flex-col gap-4">
             <OrderFormWidget 
                key={selectedSymbol}
                symbol={selectedSymbol} 
                currentPrice={price} 
                onSuccess={() => {/* Refresh Dashboard handled internally via polling or callback */}} 
             />
             <OrderBook price={price} symbol={selectedSymbol} />
          </div>
      </div>
    
      {/* Bottom Widgets */}
      <div id="market-selection" className="grid grid-cols-2 md:grid-cols-4 gap-2 h-[300px] mb-8">
          <MarketWidget title="stocks" data={stocks} onSelect={handleSelect} selectedSymbol={selectedSymbol} />
          <MarketWidget title="forex" data={forex} onSelect={handleSelect} selectedSymbol={selectedSymbol} />
          <MarketWidget title="crypto" data={crypto} onSelect={handleSelect} selectedSymbol={selectedSymbol} />
          <MarketWidget title="commodities" data={commodities} onSelect={handleSelect} selectedSymbol={selectedSymbol} />
      </div>

      {!dashboardData && !isLoading && (
        <div className="text-center p-8 border border-red-500/20 bg-red-500/5 rounded-lg">
          <p className="text-red-400 text-sm font-bold">Market Data Service Disconnected</p>
          <p className="text-gray-500 text-xs mt-1">Attempting to reconnect...</p>
        </div>
      )}

    </div>
  )
}

