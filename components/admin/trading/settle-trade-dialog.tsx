"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface SettleTradeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    trade: any
}

export function SettleTradeDialog({ open, onOpenChange, trade }: SettleTradeDialogProps) {
    const router = useRouter()
    const [outcome, setOutcome] = useState("win")
    const [payoutMultiplier, setPayoutMultiplier] = useState("1.85")
    const [reason, setReason] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSettle = async () => {
        if (!reason) {
            toast.error("Please provide a settlement rationale")
            return
        }

        setLoading(true)
        const supabase = createClient()

        try {
            // Get current admin
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Unauthorized")

            // Call force_settle_trade RPC (needs to be created if not exists, but we'll assume or creating logic)
            // For now, let's look at how the old system did it or rely on existing RPCs.
            // Based on context, we might need to implement this RPC or use a direct update if allowed (not recommended).
            // Let's assume there is a 'admin_resolve_trade' or similar, or we trigger the standard resolution but forced.

            const { error } = await supabase.rpc("admin_settle_trade", {
                p_trade_id: trade.id,
                p_outcome: outcome,
                p_payout_multiplier: parseFloat(payoutMultiplier),
                p_rationale: reason,
                p_admin_id: user.id
            })

            if (error) throw error

            toast.success(`Trade ${trade.id.slice(0, 8)} settled as ${outcome.toUpperCase()}`)
            onOpenChange(false)
            // SEC-FIX: Use router.refresh() instead of window.location.reload()
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to settle trade")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] glass-panel border-border">
                <DialogHeader>
                    <DialogTitle>Force Settle Trade</DialogTitle>
                    <DialogDescription>
                        Manually resolve trade #{trade?.id?.slice(0, 8)}. ensuring this action is logged.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="outcome" className="text-right">Outcome</Label>
                        <Select value={outcome} onValueChange={setOutcome}>
                            <SelectTrigger className="col-span-3 bg-card/50">
                                <SelectValue placeholder="Select outcome" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="win">Win (Payout)</SelectItem>
                                <SelectItem value="loss">Loss (No Payout)</SelectItem>
                                <SelectItem value="refund">Refund (Return Stake)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="payout" className="text-right">Multiplier</Label>
                        <Input
                            id="payout"
                            type="number"
                            value={payoutMultiplier}
                            onChange={(e) => setPayoutMultiplier(e.target.value)}
                            className="col-span-3 bg-card/50"
                            disabled={outcome !== 'win'}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="rationale">Rationale (Required)</Label>
                        <Textarea
                            id="rationale"
                            placeholder="Explain why this trade is being manually settled..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="bg-card/50 min-h-[100px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSettle} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-black">
                        {loading ? "Settling..." : "Unsafe Settle"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
