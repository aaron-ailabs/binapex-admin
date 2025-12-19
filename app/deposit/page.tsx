import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DepositForm } from "@/components/banking/deposit-form"
import { GlassCard } from "@/components/ui/glass-card"
import { AlertCircle } from "lucide-react"
import { getExchangeRate } from "@/app/actions/exchange-rate"
import { getPlatformBankAccounts } from "@/app/actions/get-banks"

export default async function DepositPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const banks = await getPlatformBankAccounts()

  const { rate } = await getExchangeRate()

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Deposit Funds</h1>
          <p className="text-gray-400">Transfer funds to your Binapex trading account</p>
        </div>

        <GlassCard className="p-6 border-[#F59E0B]/20 bg-[#F59E0B]/5">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-[#F59E0B]">Important Deposit Instructions</p>
              <ul className="text-gray-300 space-y-1 list-disc list-inside">
                <li>Only transfer from a bank account in your name</li>
                <li>Upload your transfer receipt after completing the bank transfer</li>
                <li>Deposits are typically processed within 15-30 minutes during business hours</li>
                <li>Minimum deposit: $50 USD equivalent</li>
              </ul>
            </div>
          </div>
        </GlassCard>

        <DepositForm 
          banks={banks || []} 
          userId={user.id} 
          currentBalance={profile?.balance_usd || 0} 
          exchangeRate={rate}
        />
      </div>
    </DashboardLayout>
  )
}
