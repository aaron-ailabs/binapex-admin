"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"



export function PendingWithdrawals({ transactions }: { transactions: any[] }) {
  if (!transactions || transactions.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Pending Requests</h3>
      <div className="grid gap-4">
        {transactions.map((tx) => {
          const details = tx.payout_details || {}
          const title = tx.method === 'BANK' ? details.bank_name : details.wallet_provider
          const sub = tx.method === 'BANK' ? details.account_number : details.wallet_id

          return (
            <GlassCard key={tx.id} className="p-4 border-yellow-500/20 bg-yellow-500/5">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px] h-5">{tx.method}</Badge>
                    <p className="text-sm font-medium text-white">Withdrawal Request</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    To: <span className="text-gray-300">{title}</span> • <span className="font-mono">{sub}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-white text-lg">
                    ${Number(tx.amount_usd).toFixed(2)}
                  </p>
                  {tx.amount_myr && (
                    <p className="text-xs text-emerald-400 font-mono">
                      ≈ RM {Number(tx.amount_myr).toFixed(2)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 justify-end mt-1">
                    <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px]">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
