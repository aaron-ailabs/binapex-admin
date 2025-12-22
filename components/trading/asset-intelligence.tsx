"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

interface AssetIntelligenceProps {
  symbol: string
  price: number
  change24h: number
}

export function AssetIntelligence({ symbol, price, change24h }: AssetIntelligenceProps) {
  const isPositive = change24h >= 0
  
  return (
    <Card className="bg-white/5 border-white/10 p-6 flex flex-col gap-4 relative overflow-hidden h-full">
      {/* Background Glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      
      <div className="z-10 flex flex-col gap-1">
        <h2 className="text-sm text-gray-400 font-mono tracking-wider">ASSET</h2>
        <div className="text-3xl font-black text-white tracking-tighter">{symbol}</div>
      </div>

      <div className="z-10 flex flex-col gap-1">
        <h2 className="text-sm text-gray-400 font-mono tracking-wider">PRICE</h2>
        <div className="text-4xl font-bold text-amber-500 font-mono">
          ${price.toFixed(price > 1000 ? 2 : 5)}
        </div>
      </div>

      <div className="z-10 flex flex-col gap-1">
        <h2 className="text-sm text-gray-400 font-mono tracking-wider">24H CHANGE</h2>
        <div className={`flex items-center gap-2 text-xl font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          <span>{isPositive ? '+' : ''}{(change24h * 100).toFixed(2)}%</span>
        </div>
      </div>
    </Card>
  )
}
