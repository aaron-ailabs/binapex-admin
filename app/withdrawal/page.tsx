import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { WithdrawalForm } from "@/components/banking/withdrawal-form"
import { PendingWithdrawals } from "@/components/banking/pending-withdrawals"
import { GlassCard } from "@/components/ui/glass-card"
import { AlertCircle } from "lucide-react"

export default async function WithdrawalPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Fetch pending withdrawals
  const { data: pendingWithdrawals } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "withdrawal")
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance, locked_balance")
    .eq("user_id", user.id)
    .eq("asset", "USD")
    .single()

  const totalBalance = Number(wallet?.balance ?? profile?.balance_usd ?? 0)
  const lockedBalance = Number(wallet?.locked_balance ?? 0)
  const bonusBalance = Number(profile?.bonus_balance ?? 0)
  const availableBalance = Math.max(0, totalBalance + bonusBalance - lockedBalance)

  const { data: userBanks } = await supabase.from("user_bank_accounts").select("*").eq("user_id", user.id)

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Withdraw Funds</h1>
          <p className="text-gray-400">Request a withdrawal to your bank account</p>
        </div>

        <GlassCard className="p-6 border-[#F59E0B]/20 bg-[#F59E0B]/5">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-[#F59E0B]">Important Withdrawal Information</p>
              <ul className="text-gray-300 space-y-1 list-disc list-inside">
                <li>Withdrawals are typically processed within 24 hours</li>
                <li>Bank account must be in your registered name</li>
                <li>Minimum withdrawal: $50 USD equivalent</li>
                <li>You cannot withdraw funds with active open positions</li>
              </ul>
            </div>
          </div>
        </GlassCard>

        {/* Pending Withdrawals Section */}
        {pendingWithdrawals && pendingWithdrawals.length > 0 && (
          <PendingWithdrawals transactions={pendingWithdrawals} />
        )}

        <WithdrawalForm
          userBanks={userBanks || []}
          userId={user.id}
          currentBalance={availableBalance} // Calculated Available
          totalBalance={totalBalance}       // For display
          lockedBalance={lockedBalance}     // For display
          bonusBalance={bonusBalance}
        />
      </div>
    </DashboardLayout>
  )
}
