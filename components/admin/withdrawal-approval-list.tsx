"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Withdrawal {
  id: string
  user_id: string
  amount: number
  status: string
  type: string
  created_at: string
  metadata: {
    bank_name?: string
    account_name?: string
    account_number?: string
    payment_method?: string
    [key: string]: unknown
  }
  profiles: {
    full_name: string
    email: string
  }
}

export function WithdrawalApprovalList() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchWithdrawals()

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
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchWithdrawals = async () => {
    // Note: We remove user_bank_accounts!inner join because 'transactions' stores bank info in 'metadata' column
    // and might not have a direct foreign key to 'user_bank_accounts' table in the current schema.
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        profiles!inner(full_name, email)
      `,
      )
      .eq("type", "withdrawal")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching withdrawals:", error)
      toast.error("Failed to load withdrawals")
    } else {
      setWithdrawals(data || [])
    }
    setLoading(false)
  }

  const handleApprove = async (withdrawalId: string) => {
    setProcessing(withdrawalId)

    const { error } = await supabase.rpc("approve_withdrawal", { transaction_id: withdrawalId })

    if (error) {
      console.error("[v0] Error approving withdrawal:", error)
      toast.error(error.message || "Failed to approve withdrawal")
    } else {
      toast.success("Withdrawal approved successfully")
      fetchWithdrawals()
      setSelectedWithdrawal(null)
    }
    setProcessing(null)
  }

  const handleReject = async (withdrawalId: string, userId: string, amount: number) => {
    setProcessing(withdrawalId)

    const { error } = await supabase.rpc("reject_withdrawal", { 
      transaction_id: withdrawalId,
      reason: "Rejected by admin" // Could add a prompt for this later
    })

    if (error) {
      console.error("[v0] Error rejecting withdrawal:", error)
      toast.error(error.message || "Failed to reject withdrawal")
    } else {
      toast.success("Withdrawal rejected and balance refunded")
      fetchWithdrawals()
      setSelectedWithdrawal(null)
    }
    setProcessing(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending")
  const completedWithdrawals = withdrawals.filter((w) => w.status === "completed")
  const rejectedWithdrawals = withdrawals.filter((w) => w.status === "rejected")

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
          <CardDescription className="text-muted-foreground">{withdrawals.length} total requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium whitespace-nowrap">User</th>
                  <th className="text-left p-4 text-muted-foreground font-medium whitespace-nowrap">Amount</th>
                  <th className="text-left p-4 text-muted-foreground font-medium whitespace-nowrap">Bank Account</th>
                  <th className="text-left p-4 text-muted-foreground font-medium whitespace-nowrap">Status</th>
                  <th className="text-left p-4 text-muted-foreground font-medium whitespace-nowrap">Date</th>
                  <th className="text-right p-4 text-muted-foreground font-medium whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      No withdrawals found
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((withdrawal) => {
                    // Extract bank info from metadata
                    const bankName = withdrawal.metadata?.bank_name || "Unknown Bank"
                    const accountNumber = withdrawal.metadata?.account_number || "N/A"
                    
                    return (
                    <tr key={withdrawal.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-foreground">{withdrawal.profiles.full_name}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.profiles.email}</div>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold text-foreground">${withdrawal.amount.toFixed(2)}</div>
                        {/* Only show payment method if it exists, otherwise hide or default */}
                         <div className="text-sm text-muted-foreground">{withdrawal.metadata?.payment_method || "Bank Transfer"}</div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">{bankName}</div>
                        <div className="text-sm text-muted-foreground">
                          {accountNumber}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <Badge
                          variant={
                            withdrawal.status === "pending"
                              ? "secondary"
                              : withdrawal.status === "completed"
                                ? "default"
                                : "destructive"
                          }
                        >
                          {withdrawal.status}
                        </Badge>
                      </td>
                      <td className="p-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedWithdrawal(withdrawal)}
                            className="hover:bg-primary/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {withdrawal.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(withdrawal.id)}
                                disabled={processing === withdrawal.id}
                                className="text-green-500 hover:bg-green-500/10"
                              >
                                {processing === withdrawal.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReject(withdrawal.id, withdrawal.user_id, withdrawal.amount)}
                                disabled={processing === withdrawal.id}
                                className="text-red-500 hover:bg-red-500/10"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal details dialog */}
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
                  <p className="font-bold text-foreground">${selectedWithdrawal.amount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <Badge
                    variant={
                      selectedWithdrawal.status === "pending"
                        ? "secondary"
                        : selectedWithdrawal.status === "completed"
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
                    <p className="font-medium text-foreground">{selectedWithdrawal.metadata?.bank_name || "Unknown Bank"}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedWithdrawal.metadata?.account_name || "Unknown A/C Name"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedWithdrawal.metadata?.account_number || "Unknown A/C Number"}
                    </p>
                  </div>
                </div>
              </div>
              {selectedWithdrawal.status === "pending" && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleApprove(selectedWithdrawal.id)}
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
                    onClick={() =>
                      handleReject(selectedWithdrawal.id, selectedWithdrawal.user_id, selectedWithdrawal.amount)
                    }
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
    </div>
  )
}
