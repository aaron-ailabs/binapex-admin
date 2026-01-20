"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Eye, Loader2, RefreshCcw, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useDeterministicFetch } from "@/hooks/use-deterministic-fetch"
import { AdminLoader } from "@/components/ui/admin-loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Withdrawal {
  id: string
  user_id: string
  amount_usd: number
  amount_myr: number
  status: string
  method: string
  created_at: string
  admin_note?: string
  payout_details: {
    bank_name?: string
    account_name?: string
    account_number?: string
    wallet_provider?: string
    wallet_id?: string
    [key: string]: unknown
  }
  profiles: {
    full_name: string
    email: string
  }
}

export function WithdrawalApprovalList() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()

  // Define fetch function
  const fetchWithdrawalsFn = useCallback(async () => {
    const { data, error } = await supabase
      .from("withdrawals")
      .select(
        `
        *,
        profiles:user_id (full_name, email)
      `,
      )
      .order("created_at", { ascending: false })

    if (error) throw error
    return data as Withdrawal[]
  }, [supabase])

  const { 
    data: withdrawals = [], 
    status, 
    error, 
    retry: fetchWithdrawals, 
    isLoading: loading 
  } = useDeterministicFetch({
    fn: fetchWithdrawalsFn,
    timeoutMs: 10000,
    onError: (err) => toast.error("Failed to load withdrawals", { description: err.message })
  })

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "REJECTED">("PENDING")
  const [searchQuery, setSearchQuery] = useState("")
  const [rejectTarget, setRejectTarget] = useState<Withdrawal | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectSubmitting, setRejectSubmitting] = useState(false)
  const [approveTarget, setApproveTarget] = useState<Withdrawal | null>(null)
  const [approveSubmitting, setApproveSubmitting] = useState(false)

  useEffect(() => {
    fetchWithdrawals()

    if (!user) return

    const channel = supabase
      .channel("withdrawal-approvals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: "type=eq.withdrawal",
        },
        () => {
          fetchWithdrawals()
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [user, fetchWithdrawals, supabase])

  const handleApprove = async (withdrawalId: string) => {
    setProcessing(withdrawalId)
    setApproveSubmitting(true)

    try {
      const response = await fetch(`/api/admin/withdrawals/${withdrawalId}/approve`, {
        method: "POST",
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok || body?.success !== true) {
        const message = body?.error || "Failed to approve withdrawal"
        toast.error(message)
        return
      }

      toast.success("Withdrawal approved successfully")
      fetchWithdrawals()
      setSelectedWithdrawal(null)
      setApproveTarget(null)
    } catch (e: any) {
      console.error("Error approving withdrawal:", e)
      toast.error(e.message || "Failed to approve withdrawal")
    } finally {
      setProcessing(null)
      setApproveSubmitting(false)
    }
  }

  const handleReject = async (withdrawalId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error("Rejection reason is required")
      return
    }

    setProcessing(withdrawalId)
    setRejectSubmitting(true)

    try {
      const response = await fetch(`/api/admin/withdrawals/${withdrawalId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok || body?.success !== true) {
        const message = body?.error || "Failed to reject withdrawal"
        toast.error(message)
        return
      }

      toast.success("Withdrawal rejected and refunded")
      fetchWithdrawals()
      setSelectedWithdrawal(null)
      setRejectTarget(null)
      setRejectReason("")
    } catch (e: any) {
      console.error("Error rejecting withdrawal:", e)
      toast.error(e.message || "Failed to reject withdrawal")
    } finally {
      setProcessing(null)
      setRejectSubmitting(false)
    }
  }

  if (loading && withdrawals.length === 0) {
    return <AdminLoader type="table" count={8} text="Loading withdrawals..." />
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error?.message || "Failed to load withdrawals"}</AlertDescription>
        </Alert>
        <Button onClick={fetchWithdrawals} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "PENDING")
  const completedWithdrawals = withdrawals.filter((w) => w.status === "COMPLETED")
  const rejectedWithdrawals = withdrawals.filter((w) => w.status === "REJECTED")

  const filteredWithdrawals = withdrawals.filter((w) => {
    const statusOk = statusFilter === "ALL" || w.status === statusFilter

    const query = searchQuery.trim().toLowerCase()
    if (!query) return statusOk

    const haystack = [
      w.profiles?.full_name,
      w.profiles?.email,
      w.id,
      w.user_id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return statusOk && haystack.includes(query)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Withdrawal Approvals</h1>
        <p className="text-muted-foreground">Review and process withdrawal requests</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingWithdrawals.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{completedWithdrawals.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{rejectedWithdrawals.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Withdrawal Requests</CardTitle>
          <CardDescription className="text-muted-foreground">
            {filteredWithdrawals.length} / {withdrawals.length} total requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Search by name, email, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md bg-background border-border"
            />
            <div className="flex gap-2">
              {(["ALL", "PENDING", "COMPLETED", "REJECTED"] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                  className={
                    statusFilter === status
                      ? "bg-[#F59E0B] text-black"
                      : "border-border bg-transparent hover:bg-muted/50"
                  }
                >
                  {status === "ALL" ? "All" : status}
                </Button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto relative max-h-[600px] border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 backdrop-blur-md sticky top-0 z-10">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">User</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Method</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Note</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Date</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-0">
                      <TableEmptyState 
                        title="No withdrawals match the current filters"
                        description="Try adjusting your search query or status filter to see more requests."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map((withdrawal) => {
                    const method = withdrawal.method || "BANK"
                    const details: any = withdrawal.payout_details || {}
                    const title = method === "BANK" ? details.bank_name : details.wallet_provider
                    const sub = method === "BANK" ? details.account_number : details.wallet_id

                    return (
                      <tr key={withdrawal.id} className="hover:bg-muted/50 transition-colors group">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground text-xs">
                              {withdrawal.profiles?.full_name || "Unknown"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase">
                              {withdrawal.profiles?.email || "No Email"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">
                          <div className="font-bold text-foreground font-mono text-xs">${withdrawal.amount_usd}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">≈ MYR {withdrawal.amount_myr}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-xs text-foreground font-medium">{method}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={`${title} (${sub})`}>
                            {title} ({sub})
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] py-0",
                              withdrawal.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : withdrawal.status === "COMPLETED"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}
                          >
                            {withdrawal.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 max-w-[150px]">
                          <div className="text-[10px] text-muted-foreground truncate" title={withdrawal.admin_note || ""}>
                            {withdrawal.admin_note || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-[10px] text-muted-foreground font-mono">
                          {format(new Date(withdrawal.created_at), "MMM dd, yyyy")}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedWithdrawal(withdrawal)}
                              className="h-7 w-7 p-0 hover:bg-primary/10"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {withdrawal.status === "PENDING" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setApproveTarget(withdrawal)}
                                  disabled={processing === withdrawal.id}
                                  className="h-7 w-7 p-0 text-emerald-500 hover:bg-emerald-500/10"
                                >
                                  {processing === withdrawal.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setRejectTarget(withdrawal)
                                    setRejectReason("")
                                  }}
                                  disabled={processing === withdrawal.id}
                                  className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Withdrawal Details</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Review withdrawal request information
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">User</label>
                  <p className="font-medium text-foreground">{selectedWithdrawal.profiles.full_name}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium text-foreground">{selectedWithdrawal.profiles.email}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Amount</label>
                  <p className="font-bold text-foreground">${selectedWithdrawal.amount_usd.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
              <Badge
                    variant={
                      selectedWithdrawal.status === "PENDING"
                        ? "secondary"
                        : selectedWithdrawal.status === "COMPLETED"
                          ? "default"
                          : "destructive"
                    }
                  >
                    {selectedWithdrawal.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground">Bank Account</label>
                  <div className="mt-1 p-3 bg-background rounded-lg border border-border">
                    <p className="font-medium text-foreground">
                      {selectedWithdrawal.method === "BANK"
                        ? selectedWithdrawal.payout_details?.bank_name
                        : selectedWithdrawal.payout_details?.wallet_provider}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedWithdrawal.method === "BANK"
                        ? selectedWithdrawal.payout_details?.account_name
                        : "Wallet ID:"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedWithdrawal.method === "BANK"
                        ? selectedWithdrawal.payout_details?.account_number
                        : selectedWithdrawal.payout_details?.wallet_id}
                    </p>
                  </div>
                </div>
                {selectedWithdrawal.admin_note && selectedWithdrawal.status !== "PENDING" && (
                  <div className="col-span-2">
                    <label className="text-sm text-muted-foreground">Admin Note</label>
                    <div className="mt-1 p-3 bg-background rounded-lg border border-border text-sm text-foreground whitespace-pre-wrap">
                      {selectedWithdrawal.admin_note}
                    </div>
                  </div>
                )}
              </div>
              {selectedWithdrawal.status === "PENDING" && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      setApproveTarget(selectedWithdrawal)
                      setSelectedWithdrawal(null)
                    }}
                    disabled={processing === selectedWithdrawal.id}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    {processing === selectedWithdrawal.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setRejectTarget(selectedWithdrawal)
                      setRejectReason("")
                    }}
                    disabled={processing === selectedWithdrawal.id}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null)
          }
        }}
      >
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Approve Withdrawal</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Confirm that you have processed this payout and want to mark it as completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {approveTarget?.profiles?.full_name} ({approveTarget?.profiles?.email})
            </div>
            <div className="text-sm text-foreground">
              Amount: <span className="font-semibold">${approveTarget?.amount_usd.toFixed(2)}</span> (≈ MYR {approveTarget?.amount_myr})
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setApproveTarget(null)
                }}
                disabled={approveSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (approveTarget) {
                    handleApprove(approveTarget.id)
                  }
                }}
                disabled={approveSubmitting}
                className="bg-green-500 hover:bg-green-600"
              >
                {approveSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirm Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reject Withdrawal</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Provide a reason for rejecting this withdrawal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {rejectTarget?.profiles?.full_name} ({rejectTarget?.profiles?.email})
            </div>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason"
              className="min-h-[120px] bg-background border-border"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectTarget(null)
                  setRejectReason("")
                }}
                disabled={rejectSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (rejectTarget) {
                    handleReject(rejectTarget.id, rejectReason)
                  }
                }}
                disabled={rejectSubmitting}
              >
                {rejectSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
