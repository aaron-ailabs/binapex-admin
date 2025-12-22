"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import type { UserBankAccount } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { submitWithdrawal, addUserBankAccount, deleteUserBankAccount } from "@/app/actions/banking"

interface WithdrawalFormProps {
  userBanks: UserBankAccount[]
  userId: string
  currentBalance: number  // This is the calculated "Available Balance"
  bonusBalance: number
  totalBalance: number
  lockedBalance: number
}

export function WithdrawalForm({ 
  userBanks, 
  userId, 
  currentBalance, 
  bonusBalance,
  totalBalance,
  lockedBalance 
}: WithdrawalFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedBank, setSelectedBank] = useState<UserBankAccount | null>(userBanks[0] || null)
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAddingBank, setIsAddingBank] = useState(false)

  // New bank form state
  const [newBank, setNewBank] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
  })

  const handleAddBank = async () => {
    if (!newBank.bank_name || !newBank.account_name || !newBank.account_number) {
      toast.error("Please fill in all bank details")
      return
    }

    if (newBank.bank_name.length < 2) {
      toast.error("Bank name must be at least 2 characters")
      return
    }

    if (newBank.account_name.length < 2) {
      toast.error("Account name must be at least 2 characters")
      return
    }

    if (!/^[0-9]+$/.test(newBank.account_number)) {
      toast.error("Account number must contain only digits")
      return
    }

    if (newBank.account_number.length < 6 || newBank.account_number.length > 20) {
      toast.error("Account number must be between 6 and 20 digits")
      return
    }

    try {
      const result = await addUserBankAccount(newBank)

      if (result.error) throw new Error(result.error)

      toast.success("Bank account added successfully")
      setNewBank({ bank_name: "", account_name: "", account_number: "" })
      setIsAddingBank(false)
      // router.refresh() is handled in action
    } catch (error: unknown) {
      console.error("Add bank error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add bank account")
    }
  }

  const handleDeleteBank = async (bankId: string) => {
    try {
      const result = await deleteUserBankAccount(bankId)

      if (result.error) throw new Error(result.error)

      toast.success("Bank account removed")
      if (selectedBank?.id === bankId) setSelectedBank(null)
      // router.refresh() is handled in action
    } catch (error: unknown) {
      console.error("Delete bank error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to remove bank account")
    }
  }

  const handleSubmitWithdrawal = async () => {
    const amountNum = Number.parseFloat(amount)

    if (!amount || isNaN(amountNum)) {
      toast.error("Please enter a valid amount")
      return
    }

    if (amountNum <= 0) {
      toast.error("Amount must be greater than zero")
      return
    }

    if (amountNum < 100) {
      toast.error("Minimum withdrawal is $100")
      return
    }

    if (amountNum > 1000000) {
      toast.error("Maximum withdrawal is $1,000,000")
      return
    }

    if (amountNum > currentBalance) {
      toast.error(`Insufficient balance. Available: $${currentBalance.toFixed(2)}`)
      return
    }

    if (!selectedBank) {
      toast.error("Please select a bank account")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitWithdrawal({
        amount: amountNum,
        user_bank_account_id: selectedBank.id
      })

      if (result.error) throw new Error(result.error)

      toast.success("Withdrawal request submitted successfully! Our team will process it shortly.")
      
      // Force balance update
      window.dispatchEvent(new Event("wallet_update"))
      
      setAmount("")
      router.push("/history")
    } catch (error: unknown) {
      console.error("Withdrawal error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit withdrawal")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Balance Display */}
      {/* Balance Display */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Balance */}
        <GlassCard className="p-6">
          <p className="text-sm text-gray-400 mb-2">Total Equity</p>
          <p className="text-2xl font-mono font-bold text-white">${totalBalance.toFixed(2)}</p>
        </GlassCard>

        {/* Locked Balance */}
        <GlassCard className="p-6 bg-red-500/5 border-red-500/20">
          <p className="text-sm text-gray-400 mb-2">Locked (Active Trades)</p>
          <p className="text-2xl font-mono font-bold text-red-400">${lockedBalance.toFixed(2)}</p>
        </GlassCard>

        {/* Bonus Balance */}
        <GlassCard className="p-6 bg-[#F59E0B]/5 border-[#F59E0B]/20">
          <p className="text-sm text-gray-400 mb-2">Bonus (Locked)</p>
          <p className="text-2xl font-mono font-bold text-[#F59E0B]">${bonusBalance.toFixed(2)}</p>
        </GlassCard>

        {/* Available Balance */}
        <GlassCard className="p-6 bg-emerald-500/5 border-emerald-500/20">
          <p className="text-sm text-gray-400 mb-2">Available to Withdraw</p>
          <p className="text-2xl font-mono font-bold text-emerald-400">${currentBalance.toFixed(2)}</p>
        </GlassCard>
      </div>

      {/* Bank Account Selection */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[#F59E0B] font-medium">Select Withdrawal Destination</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingBank(!isAddingBank)}
            className="border-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/10 bg-transparent"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Bank
          </Button>
        </div>

        {isAddingBank && (
          <GlassCard className="p-4 mb-4 border-[#F59E0B]/20">
            <div className="space-y-3">
              <div>
                <Label className="text-gray-400">Bank Name</Label>
                <Input
                  value={newBank.bank_name}
                  onChange={(e) => setNewBank({ ...newBank, bank_name: e.target.value })}
                  placeholder="e.g., Maybank"
                  className="bg-black/50 border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400">Account Name</Label>
                <Input
                  value={newBank.account_name}
                  onChange={(e) => setNewBank({ ...newBank, account_name: e.target.value })}
                  placeholder="Your full name"
                  className="bg-black/50 border-white/10"
                />
              </div>
              <div>
                <Label className="text-gray-400">Account Number</Label>
                <Input
                  value={newBank.account_number}
                  onChange={(e) => setNewBank({ ...newBank, account_number: e.target.value })}
                  placeholder="1234567890"
                  pattern="[0-9]*"
                  className="bg-black/50 border-white/10"
                />
                <p className="text-xs text-gray-500 mt-1">6-20 digits only</p>
              </div>
              <Button onClick={handleAddBank} className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold">
                Save Bank Account
              </Button>
            </div>
          </GlassCard>
        )}

        <div className="grid gap-4">
          {userBanks.map((bank) => (
            <GlassCard
              key={bank.id}
              onClick={() => setSelectedBank(bank)}
              className={`p-4 cursor-pointer transition-all ${
                selectedBank?.id === bank.id ? "border-[#F59E0B] bg-[#F59E0B]/10" : "border-white/10 hover:bg-white/5"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-bold text-white">{bank.bank_name}</h4>
                  <p className="text-sm text-gray-400">{bank.account_name}</p>
                  <p className="text-sm font-mono text-white">{bank.account_number}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteBank(bank.id)
                  }}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </GlassCard>
          ))}

          {userBanks.length === 0 && !isAddingBank && (
            <div className="text-center py-8 text-gray-400">
              <p>No bank accounts added yet</p>
              <Button
                variant="link"
                onClick={() => setIsAddingBank(true)}
                className="text-[#F59E0B] hover:text-[#FBBF24]"
              >
                Add your first bank account
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Form */}
      {userBanks.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-[#F59E0B] mb-4 font-medium">Withdrawal Amount</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400 mb-2">Amount (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 font-mono">$</span>
                <Input
                  type="number"
                  placeholder="100.00"
                  min="100"
                  max={currentBalance}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-6 bg-black/50 border-white/10 font-mono"
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum: $100.00 | Available: ${currentBalance.toFixed(2)}</p>
            </div>

            <Button
              onClick={handleSubmitWithdrawal}
              disabled={isSubmitting || !amount || !selectedBank}
              className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-black font-bold"
            >
              {isSubmitting ? "Submitting..." : "Request Withdrawal"}
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
