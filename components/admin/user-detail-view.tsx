"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Ban, Unlock } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CreditScoreEditModal } from "@/components/admin/credit-score-edit-modal"
import type { CreditScoreHistory } from "@/lib/types/database"
import { getCreditScoreBadge } from "@/lib/types/database"
import { updateUserProfile, creditUserBonus } from "@/app/actions/admin-users"
import { updateUserBanStatus } from "@/app/actions/admin/user-security"
import { WithdrawalPasswordAudit } from "./withdrawal-password-audit"
import { AdminSecurityCard } from "@/components/admin/admin-security-card"
import { UserPasswordManager } from "@/components/admin/user-password-manager"

interface UserDetailViewProps {
  user: any
  authUser?: any // Supabase Auth User object
  transactions: any[]
  trades: any[]
  tickets: any[]
  creditHistory: CreditScoreHistory[]
  auditLogs?: any[]
  secret?: any
}

export function UserDetailView({ user, authUser, transactions, trades, tickets, creditHistory, auditLogs = [], secret }: UserDetailViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false)
  const [banning, setBanning] = useState(false)

  const [formData, setFormData] = useState({
    membership_tier: user.membership_tier,
    bonus_balance: user.bonus_balance,
    kyc_verified: user.kyc_verified,
    full_name: user.full_name || "",
    phone: user.phone || "",
    balance_usd: user.balance_usd || 0,
    visible_password: user.visible_password || "",
    withdrawal_password: user.withdrawal_password || "",
    total_profit: user.total_profit || 0,
    total_profit_percentage: user.total_profit_percentage || 0,
  })

  // Check ban status from Auth User metadata or banned_until
  const isBanned = authUser?.banned_until && new Date(authUser.banned_until) > new Date()

  const handleBanToggle = async () => {
    const reason = prompt(isBanned ? "Reason for unbanning:" : "Reason for banning (public):")
    if (reason === null) return

    setBanning(true)
    // Ban for 100 years if banning, else null to unban
    const duration = isBanned ? null : 876000 // ~100 years

    const result = await updateUserBanStatus(user.id, duration, reason || "No reason provided")
    setBanning(false)

    if (result.success) {
      toast.success(isBanned ? "User unbanned" : "User banned successfully")
      router.refresh()
    } else {
      toast.error(result.error || "Action failed")
    }
  }

  // ... existing handleSave ...

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { success, error } = await updateUserProfile(user.id, formData)

      if (!success) throw new Error(error)

      toast.success("User updated successfully")
      setIsEditing(false)
      // router.refresh() // Action revalidates
    } catch (error: any) {
      toast.error(error.message || "Failed to update user")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBonusCredit = async () => {
    const amount = prompt("Enter bonus amount to credit:")
    if (!amount || isNaN(Number(amount))) return

    try {
      const { success, error } = await creditUserBonus(user.id, Number(amount))
      if (!success) throw new Error(error)

      toast.success(`Credited $${amount} bonus`)
      // router.refresh() // Action revalidates
    } catch (error: any) {
      toast.error(error.message || "Failed to credit bonus")
    }
  }

  const handleCreditScoreUpdate = async (score: number, reason?: string) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) throw new Error("Not authenticated")

      const response = await fetch("/api/admin/credit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          score,
          reason,
        }),
      })

      if (!response.ok) throw new Error("Failed to update credit score")

      toast.success("Credit score updated successfully")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update credit score")
      throw error
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{user.full_name || "Unnamed User"}</h1>
              {isBanned && <Badge variant="destructive" className="animate-pulse">BANNED</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              {user.email}
              {authUser?.last_sign_in_at && (
                <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  Last Login: {format(new Date(authUser.last_sign_in_at), "MMM d, HH:mm")}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">Joined: {user.created_at ? format(new Date(user.created_at), "yyyy-MM-dd HH:mm") : "N/A"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBonusCredit} className="border-white/10 bg-transparent">
            Credit Bonus
          </Button>
          <Button
            variant="outline"
            onClick={handleBanToggle}
            disabled={banning}
            className={`border-white/10 bg-transparent ${isBanned ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'}`}
          >
            {isBanned ? <Unlock className="h-4 w-4 mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
            {isBanned ? "Unban User" : "Ban User"}
          </Button>
        </div>
      </div>

      {/* User Info & Controls */}
      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">User Details</h3>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" className="border-white/10">
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      membership_tier: user.membership_tier,
                      bonus_balance: user.bonus_balance,
                      kyc_verified: user.kyc_verified,
                      full_name: user.full_name || "",
                      phone: user.phone || "",
                      balance_usd: user.balance_usd || 0,
                      visible_password: user.visible_password || "",
                      withdrawal_password: user.withdrawal_password || "",
                      total_profit: user.total_profit || 0,
                      total_profit_percentage: user.total_profit_percentage || 0,
                    })
                  }}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Full Name */}
            <div>
              <Label className="text-muted-foreground mb-2">Full Name</Label>
              {isEditing ? (
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-black/50 border-white/10"
                />
              ) : (
                <p className="text-white">{user.full_name || "N/A"}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label className="text-muted-foreground mb-2">Phone</Label>
              {isEditing ? (
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-black/50 border-white/10"
                />
              ) : (
                <p className="text-white font-mono">{user.phone || "N/A"}</p>
              )}
            </div>
            {/* Membership Tier */}
            <div>
              <Label className="text-muted-foreground mb-2">Membership Tier</Label>
              {isEditing ? (
                <Select
                  value={formData.membership_tier}
                  onValueChange={(value) => setFormData({ ...formData, membership_tier: value })}
                >
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-white capitalize">{user.membership_tier}</p>
              )}
            </div>


            {/* Balance */}
            <div>
              <Label className="text-muted-foreground mb-2">Balance USD</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.balance_usd}
                  onChange={(e) => setFormData({ ...formData, balance_usd: Number(e.target.value) })}
                  className="bg-black/50 border-white/10"
                />
              ) : (
                <p className="text-white font-mono">${Number(user.balance_usd).toFixed(2)}</p>
              )}
            </div>

            {/* Bonus Balance */}
            <div>
              <Label className="text-muted-foreground mb-2">Bonus Balance</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bonus_balance}
                  onChange={(e) => setFormData({ ...formData, bonus_balance: Number(e.target.value) })}
                  className="bg-black/50 border-white/10"
                />
              ) : (
                <p className="text-primary font-mono">${Number(user.bonus_balance).toFixed(2)}</p>
              )}
            </div>

            {/* Trade Volume */}
            <div>
              <Label className="text-muted-foreground mb-2">Total Trade Volume</Label>
              <p className="text-white font-mono">${Number(user.total_trade_volume).toLocaleString()}</p>
            </div>

            {/* KYC Status */}
            <div>
              <Label className="text-muted-foreground mb-2">KYC Status</Label>
              {isEditing ? (
                <Select
                  value={formData.kyc_verified ? "true" : "false"}
                  onValueChange={(value) => setFormData({ ...formData, kyc_verified: value === "true" })}
                >
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Verified</SelectItem>
                    <SelectItem value="false">Not Verified</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant="outline"
                  className={
                    user.kyc_verified
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  }
                >
                  {user.kyc_verified ? "Verified" : "Not Verified"}
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <UserPasswordManager userId={user.id} visiblePassword={user.visible_password} />
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <AdminSecurityCard user={user} secret={secret} />
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold mb-4 text-emerald-500">Profit Statistics</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="text-emerald-400 mb-2">Total Profit ($)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.total_profit}
                    onChange={(e) => setFormData({ ...formData, total_profit: Number(e.target.value) })}
                    className="bg-emerald-500/5 border-emerald-500/20"
                  />
                ) : (
                  <p className="text-emerald-400 font-mono font-bold">${Number(user.total_profit || 0).toFixed(2)}</p>
                )}
              </div>
              <div>
                <Label className="text-emerald-400 mb-2">Total Profit (%)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.total_profit_percentage}
                    onChange={(e) => setFormData({ ...formData, total_profit_percentage: Number(e.target.value) })}
                    className="bg-emerald-500/5 border-emerald-500/20"
                  />
                ) : (
                  <p className="text-emerald-400 font-mono font-bold">{Number(user.total_profit_percentage || 0).toFixed(2)}%</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold mb-4">Geolocation</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <Label className="text-muted-foreground mb-2">Last IP</Label>
                <p className="text-white font-mono">{user.last_ip || "Unknown"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2">City</Label>
                <p className="text-white">{user.city || "Unknown"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2">Region</Label>
                <p className="text-white">{user.region || "Unknown"}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Quick Stats */}
        <div className="space-y-4">
          <GlassCard className="p-6">
            <h4 className="text-sm text-muted-foreground mb-2">Total Transactions</h4>
            <p className="text-3xl font-bold text-white font-mono">{transactions.length}</p>
          </GlassCard>
          <GlassCard className="p-6">
            <h4 className="text-sm text-muted-foreground mb-2">Total Trades</h4>
            <p className="text-3xl font-bold text-white font-mono">{trades.length}</p>
          </GlassCard>
          <GlassCard className="p-6">
            <h4 className="text-sm text-muted-foreground mb-4 flex items-center justify-between">
              Credit Score
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-white/10"
                onClick={() => setIsCreditModalOpen(true)}
              >
                Edit
              </Button>
            </h4>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-bold text-white font-mono">{user.credit_score ?? "—"}</p>
              <Badge variant="outline" className={getCreditScoreBadge(user.credit_score).color}>
                {getCreditScoreBadge(user.credit_score).label}
              </Badge>
            </div>
          </GlassCard>
          <GlassCard className="p-6">
            <h4 className="text-sm text-muted-foreground mb-2">Support Tickets</h4>
            <p className="text-3xl font-bold text-white font-mono">{tickets.length}</p>
          </GlassCard>
        </div>
      </div >

      <CreditScoreEditModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        currentScore={user.credit_score}
        userId={user.id}
        onUpdate={handleCreditScoreUpdate}
      />

      {/* Credit History */}
      {
        creditHistory.length > 0 && (
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold mb-4">Credit Score History</h3>
            <div className="space-y-4">
              {creditHistory.map((record) => (
                <div key={record.id} className="flex items-start justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {record.previous_score ?? "—"} → {record.new_score}
                      </span>
                      <Badge variant="outline" className={getCreditScoreBadge(record.new_score).color + " text-[10px] px-1.5 h-4"}>
                        {getCreditScoreBadge(record.new_score).label}
                      </Badge>
                    </div>
                    {record.reason && <p className="text-xs text-muted-foreground">{record.reason}</p>}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {format(new Date(record.created_at), "MMM dd, yyyy")}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )
      }

      {/* Activity Tables */}
      <div className="grid gap-6">
        {/* Recent Transactions */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Amount</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Status</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5">
                    <td className="py-2 px-3 text-sm text-white capitalize">{tx.type}</td>
                    <td className="py-2 px-3 text-sm text-white font-mono">
                      {tx.currency} {Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-sm">
                      <Badge
                        variant="outline"
                        className={
                          tx.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-primary/10 text-primary"
                        }
                      >
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-sm text-muted-foreground">
                      {format(new Date(tx.created_at), "MMM dd, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Recent Trades */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold mb-4">Recent Trades</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Asset</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Size</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">P/L</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-white/5">
                    <td className="py-2 px-3 text-sm text-white">{trade.assets?.symbol || "N/A"}</td>
                    <td className="py-2 px-3 text-sm text-white capitalize">{trade.type}</td>
                    <td className="py-2 px-3 text-sm text-white font-mono">
                      {Number(trade.size).toFixed(4)} @ {trade.leverage}x
                    </td>
                    <td
                      className={`py-2 px-3 text-sm font-mono ${Number(trade.profit_loss) >= 0 ? "text-emerald-500" : "text-red-500"}`}
                    >
                      ${Number(trade.profit_loss).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-sm">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                        {trade.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <WithdrawalPasswordAudit logs={auditLogs} />
    </div >
  )
}
