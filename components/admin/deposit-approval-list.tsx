"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, ExternalLink, ImageIcon } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useLiveData } from "@/hooks/use-live-data"
import Link from "next/link"

interface DepositApprovalListProps {
  deposits: any[]
}

// SEC-FIX: Use environment variable instead of hardcoded URL
const getReceiptUrl = (url: string | null) => {
  if (!url) return null
  if (url.startsWith("http")) return url
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kzpbaacqhpszizgsyflc.supabase.co"
  return `${supabaseUrl}/storage/v1/object/public/receipts/${url}`
}

export function DepositApprovalList({ deposits: initialDeposits }: DepositApprovalListProps) {
  const router = useRouter()
  const supabase = createClient()
  const deposits = useLiveData("transactions", initialDeposits, { column: "created_at", ascending: false }).filter(
    (d: any) => d.type === "deposit" && d.status === "pending",
  )
  const [processing, setProcessing] = useState<string | null>(null)
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null)

  const handleApprove = async (depositId: string, userId: string, amount: number) => {
    setProcessing(depositId)
    try {
      const response = await fetch(`/api/admin/deposits/${depositId}/approve`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to approve deposit")
      }

      toast.success("Deposit approved and balance credited")
      router.refresh()
    } catch (error: any) {
      console.error("[v0] Approve deposit error:", error)
      toast.error(error.message || "Failed to approve deposit")
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (depositId: string, userId: string) => {
    const reason = prompt("Enter rejection reason (optional):")

    setProcessing(depositId)
    try {
      const response = await fetch(`/api/admin/deposits/${depositId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reject deposit")
      }

      toast.success("Deposit rejected")
      router.refresh()
    } catch (error: any) {
      console.error("[v0] Reject deposit error:", error)
      toast.error(error.message || "Failed to reject deposit")
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-foreground">Pending Deposits ({deposits.length})</h3>
        <Link href="/admin/finance/accounts">
          <Button variant="outline" className="border-border bg-transparent hover:bg-card">
            Manage Bank Accounts
          </Button>
        </Link>
      </div>

      {deposits.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <p className="text-muted-foreground">No pending deposits</p>
        </GlassCard>
      ) : (
        deposits.map((deposit: any) => (
          <GlassCard key={deposit.id} className="p-4 md:p-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Deposit Info */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-lg font-bold text-foreground">
                      {deposit.currency} {Number(deposit.amount).toLocaleString()}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {deposit.full_name || "Unknown"} ({deposit.email})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current Balance:{" "}
                      <span className="text-foreground font-medium">
                        ${(deposit.user?.wallets?.[0]?.balance || 0).toLocaleString()}
                      </span>
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Pending
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Transaction ID</p>
                    <p className="text-foreground font-mono text-xs break-all">{deposit.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="text-foreground">{deposit.payment_method || "Bank Transfer"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="text-foreground">{format(new Date(deposit.created_at), "MMM dd, yyyy HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">User ID</p>
                    <p className="text-foreground font-mono text-xs break-all">{deposit.user_id}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleApprove(deposit.id, deposit.user_id, deposit.amount)}
                    disabled={processing === deposit.id}
                    className="bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {processing === deposit.id ? "Processing..." : "Approve"}
                  </Button>
                  <Button
                    onClick={() => handleReject(deposit.id, deposit.user_id)}
                    disabled={processing === deposit.id}
                    variant="outline"
                    className="border-destructive/20 text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>

              {/* Receipt Preview */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Payment Receipt</p>
                {deposit.receipt_url ? (
                  <div className="space-y-2">
                    <img
                      src={getReceiptUrl(deposit.receipt_url) || "/placeholder.svg"}
                      alt="Receipt"
                      className="w-full rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setViewingReceipt(getReceiptUrl(deposit.receipt_url))}
                    />
                    <a
                      href={getReceiptUrl(deposit.receipt_url) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Full Size
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 bg-card rounded-lg border border-border">
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No receipt uploaded</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        ))
      )}

      {/* Receipt Modal */}
      {viewingReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewingReceipt(null)}
        >
          <img
            src={viewingReceipt || "/placeholder.svg"}
            alt="Receipt Full Size"
            className="max-w-full max-h-full rounded-lg"
          />
        </div>
      )}
    </div>
  )
}
