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
    <tr className="hover:bg-white/5 transition-colors group">
      {/* Asset Info */}
      <td className="px-6 py-2 whitespace-nowrap">
        <div className="flex items-center gap-2">
           <div className="font-bold text-white text-xs">{asset.symbol}</div>
           <span className={cn(
             "text-[9px] px-1 rounded-sm uppercase font-mono",
             asset.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
           )}>
              {asset.is_active ? 'Active' : 'Inactive'}
           </span>
        </div>
      </td>

      {/* Name (Desktop Only) */}
      <td className="px-6 py-2 text-gray-500 text-xs hidden md:table-cell uppercase tracking-tight">{asset.name}</td>

      {/* Payout Rate input */}
      <td className="px-6 py-2">
        <div className="flex items-center gap-2 max-w-[100px]">
          <div className="relative w-full group/input">
            <Input
              type="number"
              min="0"
              max="100"
              value={payoutRate}
              onChange={handleChange}
              className="bg-black/20 border-white/5 h-7 text-xs font-mono pr-6 focus:border-primary/50"
            />
            <span className="absolute right-2 top-1.5 text-[10px] text-gray-600">%</span>
          </div>
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-2 text-right">
         <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
                size="sm" 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges}
                className={cn(
                  "h-7 px-2 text-[10px] font-bold",
                  hasChanges ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-white/5 text-gray-500'
                )}
            >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save
            </Button>
         </div>
      </td>
    </tr>
  )
}
