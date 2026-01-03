"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Lock } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { submitWithdrawal } from "@/app/actions/banking"

interface WithdrawalFormProps {
  userBanks: any[] // Keeping flexible for now
  currentBalance: number
}

export function WithdrawalForm({ currentBalance }: WithdrawalFormProps) {
  const router = useRouter()
  const [method, setMethod] = useState<"BANK" | "EWALLET">("BANK")
  const [amount, setAmount] = useState("")
  const [withdrawalPassword, setWithdrawalPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  // Form Details
  const [bankDetails, setBankDetails] = useState({
    bank_name: "",
    account_number: "",
    account_name: ""
  })
  const [walletDetails, setWalletDetails] = useState({
    wallet_provider: "",
    wallet_id: "" // e.g. Phone number
  })

  // Constants (Mocked for now as per plan)
  const EXCHANGE_RATE = 4.45
  const FEE = 0 // Fixed fee or percentage

  // Calculated Values
  const amountNum = parseFloat(amount) || 0
  const finalPayout = (amountNum * EXCHANGE_RATE) - FEE

  const handleSubmit = async () => {
    setErrorMessage(null)

    if (!amount || amountNum < 50) {
      toast.error("Minimum withdrawal is $50")
      return
    }
    if (amountNum > currentBalance) {
      toast.error("Insufficient balance")
      return
    }
    if (!withdrawalPassword) {
      toast.error("Password required")
      return
    }

    setIsSubmitting(true)

    const payload = {
      amount: amountNum,
      method,
      payout_details: method === "BANK" ? bankDetails : walletDetails,
      withdrawal_password: withdrawalPassword
    }

    const result = await submitWithdrawal(payload)

    setIsSubmitting(false)

    if (result.error) {
      // Error Handling Logic
      if (result.error.includes("three times") || result.error.includes("contact Customer Service")) {
        setIsLocked(true)
        setErrorMessage("Account Locked. Contact Customer Service.")
      } else {
        setErrorMessage(result.error)
        toast.error(result.error)
      }
    } else {
      toast.success("Withdrawal submitted successfully!")
      router.push("/history") // or success page
    }
  }

  if (isLocked) {
    return (
      <GlassCard className="p-8 border-red-500/50 bg-red-500/10 text-center">
        <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Account Locked</h2>
        <p className="text-red-200 mb-6">
          Your withdrawal facility has been locked due to multiple incorrect password attempts.
        </p>
        <Button variant="outline" className="border-red-500/50 text-red-400">
          Contact Customer Service
        </Button>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold mb-6 text-[#F59E0B]">Request Withdrawal</h3>

        <Tabs defaultValue="BANK" onValueChange={(val) => setMethod(val as "BANK" | "EWALLET")}>
          <TabsList className="grid w-full grid-cols-2 bg-white/5 mb-6">
            <TabsTrigger value="BANK">Bank Transfer</TabsTrigger>
            <TabsTrigger value="EWALLET">e-Wallet</TabsTrigger>
          </TabsList>

          <div className="space-y-4 mb-6">
            <div>
              <Label className="text-gray-400 mb-2">Amount (USD)</Label>
              <Input
                type="number"
                placeholder="Min $50.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-black/50 border-white/10 font-mono text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Available: ${currentBalance.toFixed(2)}</p>
            </div>

            <TabsContent value="BANK" className="space-y-4 m-0">
              <div>
                <Label className="text-gray-400 mb-2">Bank Name</Label>
                <Input
                  placeholder="e.g. Maybank, CIMB"
                  value={bankDetails.bank_name}
                  onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                  className="bg-black/50 border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400 mb-2">Account Number</Label>
                <Input
                  placeholder="Enter account number"
                  value={bankDetails.account_number}
                  onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                  className="bg-black/50 border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400 mb-2">Account Holder Name</Label>
                <Input
                  placeholder="Must match your KYC name"
                  value={bankDetails.account_name}
                  onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })}
                  className="bg-black/50 border-white/10"
                />
              </div>
            </TabsContent>

            <TabsContent value="EWALLET" className="space-y-4 m-0">
              <div>
                <Label className="text-gray-400 mb-2">e-Wallet Provider</Label>
                <Input
                  placeholder="e.g. TNG, GrabPay"
                  value={walletDetails.wallet_provider}
                  onChange={(e) => setWalletDetails({ ...walletDetails, wallet_provider: e.target.value })}
                  className="bg-black/50 border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400 mb-2">Wallet ID / Phone Number</Label>
                <Input
                  placeholder="+60..."
                  value={walletDetails.wallet_id}
                  onChange={(e) => setWalletDetails({ ...walletDetails, wallet_id: e.target.value })}
                  className="bg-black/50 border-white/10"
                />
              </div>
            </TabsContent>
          </div>

          {/* Live Preview Card */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Exchange Rate</span>
              <span className="text-white font-mono">1 USD = {EXCHANGE_RATE} MYR</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Fees</span>
              <span className="text-white font-mono">${FEE.toFixed(2)}</span>
            </div>
            <div className="border-t border-emerald-500/20 pt-2 flex justify-between items-center">
              <span className="text-emerald-400 font-bold">Final Payout</span>
              <span className="text-2xl font-bold text-white font-mono">
                RM {finalPayout > 0 ? finalPayout.toFixed(2) : "0.00"}
              </span>
            </div>
          </div>

          {/* Security Verification */}
          <div className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Withdrawal Failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label className="text-gray-400 mb-2">Enter Withdrawal Password</Label>
              <Input
                type="password"
                placeholder="••••••"
                className="bg-black/50 border-white/10 text-center tracking-widest text-lg"
                value={withdrawalPassword}
                onChange={(e) => setWithdrawalPassword(e.target.value)}
              />
            </div>

            <Button
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold h-12"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Confirm Withdrawal"}
            </Button>
          </div>

        </Tabs>
      </GlassCard>
    </div>
  )
}
