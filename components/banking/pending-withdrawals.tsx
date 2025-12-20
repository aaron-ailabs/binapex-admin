"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

interface Transaction {
  id: string
  created_at: string
  amount: number
  status: string
  type: string
  metadata?: any
}

interface PendingWithdrawalsProps {
  transactions: Transaction[]
}

export function PendingWithdrawals({ transactions }: PendingWithdrawalsProps) {
  if (transactions.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Pending Requests</h3>
      <div className="grid gap-4">
        {transactions.map((tx) => (
          <GlassCard key={tx.id} className="p-4 border-yellow-500/20 bg-yellow-500/5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-white">Withdrawal Request</p>
                <p className="text-xs text-gray-400">
                  {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                </p>
                {tx.metadata?.bank_name && (
                   <p className="text-xs text-gray-500 mt-1">
                     To: {tx.metadata.bank_name} ••• {tx.metadata.account_number?.slice(-4)}
                   </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-white text-lg">
                  ${Math.abs(tx.amount).toFixed(2)}
                </p>
                <div className="flex items-center gap-2 justify-end mt-1">
                    <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px]">
                    PENDING PROCESS
                    </Badge>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
