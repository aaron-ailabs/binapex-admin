"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { adjustUserBalance } from "@/app/actions/admin-users"
import { Wallet, Info } from "lucide-react"

interface ManualBalanceAdjustmentModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    userEmail: string
}

export function ManualBalanceAdjustmentModal({
    isOpen,
    onClose,
    userId,
    userEmail
}: ManualBalanceAdjustmentModalProps) {
    const [loading, setLoading] = useState(false)
    const [asset, setAsset] = useState("USD")
    const [amount, setAmount] = useState("")
    const [type, setType] = useState<'credit' | 'debit'>('credit')
    const [reason, setReason] = useState("")

    const handleAdjust = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast.error("Please enter a valid positive amount")
            return
        }

        if (!reason) {
            toast.error("Reason is mandatory for audit trail")
            return
        }

        setLoading(true)
        const result = await adjustUserBalance(userId, asset, Number(amount), type, reason)
        setLoading(false)

        if (result.success) {
            toast.success(`Successfully ${type}ed ${amount} ${asset} to ${userEmail}`)
            onClose()
            setAmount("")
            setReason("")
        } else {
            toast.error(result.error || "Adjustment failed")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#121212] border-white/10 text-white md:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-titan-gold" />
                        Manual Balance Adjustment
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Adjusting balance for: <span className="text-white font-medium">{userEmail}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-400">Adjustment Type</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger className="bg-black/40 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                                    <SelectItem value="credit" className="text-emerald-500">Credit (+)</SelectItem>
                                    <SelectItem value="debit" className="text-red-500">Debit (-)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-400">Asset</Label>
                            <Select value={asset} onValueChange={setAsset}>
                                <SelectTrigger className="bg-black/40 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                                    <SelectItem value="USD">USD (Tether)</SelectItem>
                                    <SelectItem value="BTC">Bitcoin</SelectItem>
                                    <SelectItem value="ETH">Ethereum</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-400">Amount</Label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-black/40 border-white/10 focus:border-titan-gold/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-400">Reason</Label>
                        <Input
                            placeholder="e.g. Compensation for downtime, Error Correction..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="bg-black/40 border-white/10 focus:border-titan-gold/50"
                        />
                    </div>

                    <div className="flex gap-2 p-3 rounded-md bg-titan-gold/5 border border-titan-gold/20">
                        <Info className="h-4 w-4 text-titan-gold shrink-0 mt-0.5" />
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            This action will update the user's wallet atomically and create a transaction record.
                            It will be permanently logged in the admin activity trail.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdjust}
                        disabled={loading || !amount || !reason}
                        className={`font-bold transition-all ${type === 'credit'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                    >
                        {loading ? "Processing..." : `Confirm ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
