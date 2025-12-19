"use client"

import { useState, ChangeEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Save, Loader2 } from "lucide-react"

interface Asset {
  id: string
  symbol: string
  name: string
  payout_rate: number
  is_active: boolean
}

interface AdminAssetRowProps {
  asset: Asset
}

export function AdminAssetRow({ asset }: AdminAssetRowProps) {
  const supabase = createClient()
  const [payoutRate, setPayoutRate] = useState(asset.payout_rate || 85) // Default to 85 if null
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (val >= 0 && val <= 100) {
      setPayoutRate(val)
      setHasChanges(true)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("assets")
        .update({ payout_rate: payoutRate })
        .eq("id", asset.id)

      if (error) throw error

      toast.success(`Updated ${asset.symbol} payout rate to ${payoutRate}%`)
      setHasChanges(false)
    } catch (error: any) {
      console.error("Update error:", error)
      toast.error("Failed to update payout rate")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <tr className="flex flex-col md:table-row border-b border-white/5 hover:bg-white/5 transition-colors p-4 md:p-0 gap-4">
      {/* Asset Info */}
      <td className="md:p-4 flex justify-between items-center md:table-cell">
        <div>
           <div className="font-medium text-white">{asset.symbol}</div>
           <div className="text-xs text-gray-500 md:hidden">{asset.name}</div>
        </div>
        {/* Status Indicator for Mobile */}
        <div className="md:hidden">
             <span className={`text-[10px] px-2 py-0.5 rounded ${asset.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {asset.is_active ? 'Active' : 'Inactive'}
             </span>
        </div>
      </td>

      {/* Name (Desktop Only) */}
      <td className="p-4 text-gray-400 hidden md:table-cell">{asset.name}</td>

      {/* Payout Rate input */}
      <td className="md:p-4 md:table-cell block">
        <label className="text-xs text-gray-500 mb-1 block md:hidden">Payout Rate (%)</label>
        <div className="flex items-center gap-2 max-w-full md:max-w-[150px]">
          <div className="relative w-full">
            <Input
              type="number"
              min="0"
              max="100"
              value={payoutRate}
              onChange={handleChange}
              className="bg-black/20 border-white/10 pr-8 w-full"
            />
            <span className="absolute right-3 top-2.5 text-xs text-gray-500">%</span>
          </div>
        </div>
      </td>

      {/* Actions */}
      <td className="md:p-4 md:text-right md:table-cell block">
         <div className="flex justify-end w-full">
            <Button 
                size="sm" 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges}
                className={`w-full md:w-auto ${hasChanges ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-white/5 text-gray-500'}`}
            >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2 md:mr-0" />}
                <span className="md:hidden">{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
         </div>
      </td>
    </tr>
  )
}
