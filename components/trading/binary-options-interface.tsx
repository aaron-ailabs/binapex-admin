"use client"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from 'next/dynamic'
import { ExecutionWidget } from "./execution-widget"
import { ActivePositions } from "./active-positions"
import { MarketWidget } from "./market-widget"
import { GlassCard } from "@/components/ui/glass-card"
import { useMarketData } from "@/hooks/useMarketData"
import { useUserPortfolio } from "@/hooks/use-user-portfolio"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

// Dynamic import for Chart
const CandlestickChart = dynamic(
  () => import('./candlestick-chart').then(mod => mod.CandlestickChart),
  { ssr: false }
)

interface AssetInfo {
  symbol: string
  price?: number
  rate?: number
  change_pct?: number
  payout_rate?: number
  [key: string]: any 
}

interface DashboardData {
    stocks: Record<string, AssetInfo>
    forex: Record<string, AssetInfo>
    crypto: Record<string, AssetInfo>
    commodities: Record<string, AssetInfo>
}

interface BinaryOptionsInterfaceProps {
    initialBalance?: number
}

export function BinaryOptionsInterface({ initialBalance = 0 }: BinaryOptionsInterfaceProps) {
    const searchParams = useSearchParams()
    // State
    const [selectedSymbol, setSelectedSymbol] = useState(searchParams.get('asset') || "BTC/USD")
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [payoutRate, setPayoutRate] = useState(85)
    
    // Hooks
    const { candles, currentPrice: hookPrice, change24h: hookChange } = useMarketData(selectedSymbol)
    const { balance_usd, isLoading: isPortfolioLoading } = useUserPortfolio()
    const supabase = createClient()
    
    // Determine effective balance: prefer client-side real data if available and non-zero
    // but fallback to initial server-side balance to avoid "0.00" flash
    const effectiveBalance = (balance_usd > 0) ? balance_usd : initialBalance;

    // 1. Sync URL to State
    useEffect(() => {
        const asset = searchParams.get('asset')
        if (asset && asset !== selectedSymbol) {
             setSelectedSymbol(asset)
        }
    }, [searchParams])

    // 2. Fetch Dashboard Data (Assets list)
    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await fetch("/api/market/dashboard")
                if (res.ok) {
                    const data = await res.json()
                    setDashboardData(data)
                }
            } catch (e) {
                console.error("Dashboard error", e)
            }
        }
        fetchDashboard()
        const interval = setInterval(fetchDashboard, 5000)
        return () => clearInterval(interval)
    }, [])

    // 3. Fetch specific Payout Rate from DB (or get from dashboard)
    useEffect(() => {
        const fetchAssetInfo = async () => {
             const { data } = await supabase
                .from('assets')
                .select('payout_rate')
                .eq('symbol', selectedSymbol)
                .single()
             
             if (data && data.payout_rate) setPayoutRate(data.payout_rate)
        }
        fetchAssetInfo()
    }, [selectedSymbol])

    // Derived Data for Display
    const currentAssetInfo = dashboardData 
        ? Object.values(dashboardData)
            .flatMap((cat) => Object.values(cat) as AssetInfo[])
            .find((asset) => asset.symbol === selectedSymbol) || null
        : null;

    const price = hookPrice > 0 ? hookPrice : (currentAssetInfo?.price || currentAssetInfo?.rate || 0)

    const handleSelect = (symbol: string, category: string) => {
        setSelectedSymbol(symbol)
        // Optionally update URL
    }

    if (isPortfolioLoading && initialBalance === 0) {
         // Only block if we have NO data
        return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-amber-500" /></div>
    }
    
    const stocks = dashboardData?.stocks || {}
    const forex = dashboardData?.forex || {}
    const crypto = dashboardData?.crypto || {}
    const commodities = dashboardData?.commodities || {}

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 min-h-[calc(100vh-80px)] flex flex-col gap-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[600px]">
                {/* Column 1: CHART (Previously Asset Intelligence) (6 cols) */}
                <div className="lg:col-span-6 h-full min-h-[400px] flex flex-col gap-4">
                     <GlassCard className="flex-1 p-1 overflow-hidden relative border border-white/5 bg-black/40">
                         {/* Header Overlay */}
                         <div className="absolute top-4 left-4 z-10 flex flex-col">
                             <h1 className="text-3xl font-black text-white tracking-tighter shadow-black drop-shadow-md">{selectedSymbol}</h1>
                             <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-amber-500 font-mono">${price.toFixed(price > 1000 ? 2 : 5)}</span>
                                {hookChange !== 0 && (
                                     <span className={`text-sm font-bold ${hookChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                         {hookChange > 0 ? '+' : ''}{(hookChange * 100).toFixed(2)}%
                                     </span>
                                )}
                             </div>
                         </div>
                         <CandlestickChart symbol={selectedSymbol} data={candles} />
                     </GlassCard>
                </div>

                {/* Column 2: Execution Widget (3 cols) */}
                <div className="lg:col-span-3 h-full">
                    <ExecutionWidget 
                        symbol={selectedSymbol}
                        currentPrice={price}
                        payoutRate={payoutRate}
                        balance={effectiveBalance}
                        onSuccess={() => {}}
                    />
                </div>

                {/* Column 3: Active Positions (3 cols) */}
                <div className="lg:col-span-3 h-full min-h-[400px]">
                    <ActivePositions />
                </div>
            </div>

            {/* Bottom: Asset Selector Grid */}
            <div id="market-selection" className="grid grid-cols-2 md:grid-cols-4 gap-2 h-[300px] mb-8">
                <MarketWidget title="crypto" data={crypto} onSelect={handleSelect} selectedSymbol={selectedSymbol} />
                <MarketWidget title="forex" data={forex} onSelect={handleSelect} selectedSymbol={selectedSymbol} />
                <MarketWidget title="stocks" data={stocks} onSelect={handleSelect} selectedSymbol={selectedSymbol} />
                <MarketWidget title="commodities" data={commodities} onSelect={handleSelect} selectedSymbol={selectedSymbol} />
            </div>

        </div>
    )
}
