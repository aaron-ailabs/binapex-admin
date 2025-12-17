"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ExchangeRateManagerProps {
  initialRate: number
  lastUpdated: string | null
}

export function ExchangeRateManager({ initialRate, lastUpdated }: ExchangeRateManagerProps) {
  const [rate, setRate] = useState(initialRate.toString())
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const handleUpdate = async () => {
    const rateNum = parseFloat(rate)
    if (isNaN(rateNum) || rateNum < 2.0 || rateNum > 10.0) {
      toast.error("Please enter a valid rate between 2.0 and 10.0")
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch('/api/admin/update-exchange-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rate: rateNum }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to update exchange rate')
      } else {
        toast.success("Exchange rate updated successfully")
        router.refresh()
      }
    } catch (error) {
      console.error('Error updating exchange rate:', error)
      toast.error("Failed to update rate")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <GlassCard className="p-6 border-[#F59E0B]/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">USD to MYR Exchange Rate</h2>
        <RefreshCw className={`h-4 w-4 text-gray-400 ${isUpdating ? "animate-spin" : ""}`} />
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="rate" className="text-gray-400">Current Rate (1 USD = ? MYR)</Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="bg-black/50 border-white/10 text-lg font-mono"
            disabled={isUpdating}
          />
        </div>
        <Button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold"
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Update Rate
        </Button>
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-500 mt-3">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </p>
      )}
    </GlassCard>
  )
}
