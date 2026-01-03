import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { WithdrawalForm } from "@/components/banking/withdrawal-form"
import { PendingWithdrawals } from "@/components/banking/pending-withdrawals"

import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
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

  // Check for withdrawal password existence
  const { data: secret } = await supabase
    .from("user_withdrawal_secrets")
    .select("is_locked")
    .eq("user_id", user.id)
    .single()

  // Fetch pending withdrawals from new table
  const { data: pendingWithdrawals } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance, locked_balance")
    .eq("user_id", user.id)
    .eq("asset", "USD")
    .single()

  const { data: userBanks } = await supabase
    .from("user_banks")
    .select("*")
    .eq("user_id", user.id)

  const { data: profile } = await supabase
    .from("profiles")
    .select("balance_usd, bonus_balance")
    .eq("id", user.id)
    .single()

  const totalBalance = Number(wallet?.balance ?? profile?.balance_usd ?? 0)
  const lockedBalance = Number(wallet?.locked_balance ?? 0)
  const bonusBalance = Number(profile?.bonus_balance ?? 0)
  const availableBalance = Math.max(0, totalBalance + bonusBalance - lockedBalance)

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Withdraw Funds</h1>
          <p className="text-gray-400">Request a withdrawal to your bank account or e-wallet</p>
        </div>

        <GlassCard className="p-6 border-[#F59E0B]/20 bg-[#F59E0B]/5">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-[#F59E0B]">Important Withdrawal Information</p>
              <ul className="text-gray-300 space-y-1 list-disc list-inside">
                <li>Withdrawals are typically processed within 24 hours</li>
                <li>Account details must match your KYC name</li>
                <li>Minimum withdrawal: $50 USD equivalent</li>
                <li>Exchange Rate: 1 USD = 4.45 MYR</li>
              </ul>
            </div>
          </div>
        </GlassCard>

        {/* Pending Withdrawals Section */}
        {pendingWithdrawals && pendingWithdrawals.length > 0 && (
          <PendingWithdrawals transactions={pendingWithdrawals} />
        )}

        {!secret ? (
          <GlassCard className="p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-[#F59E0B] mx-auto" />
            <h2 className="text-xl font-bold text-white">Withdrawal Password Not Set</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              For your security, you must set up a specific withdrawal password before you can request funds.
            </p>
            <Link href="/settings">
              <Button variant="default" className="bg-[#F59E0B] text-black font-bold hover:bg-[#D97706]">
                Go to Settings to Setup
              </Button>
            </Link>
          </GlassCard>
        ) : (
          <WithdrawalForm currentBalance={availableBalance} userBanks={userBanks || []} />
        )}
      </div>
    </DashboardLayout>
  )
}
