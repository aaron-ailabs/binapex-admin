"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check } from "lucide-react"
import type { PlatformBankAccount } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { submitDeposit } from "@/app/actions/banking"

interface DepositFormProps {
  banks: PlatformBankAccount[]
  userId: string

  currentBalance: number
  exchangeRate: number
}

export function DepositForm({ banks, userId, currentBalance, exchangeRate }: DepositFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedBank, setSelectedBank] = useState<PlatformBankAccount | null>(banks[0] || null)
  const [amount, setAmount] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
    toast.success("Copied to clipboard")
  }

  const handleSubmit = async () => {
    const amountNum = Number.parseFloat(amount)

    if (!amount || isNaN(amountNum)) {
      toast.error("Please enter a valid amount")
      return
    }

    if (amountNum <= 0) {
      toast.error("Amount must be greater than zero")
      return
    }

    if (amountNum < 50) {
      toast.error("Minimum deposit is $50")
      return
    }

    if (amountNum > 1000000) {
      toast.error("Maximum deposit is $1,000,000")
      return
    }

    if (!receiptFile) {
      toast.error("Please upload your transfer receipt")
      return
    }

    if (receiptFile.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB")
      return
    }

    if (!["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(receiptFile.type)) {
      toast.error("Only JPG, PNG, and PDF files are allowed")
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("file", receiptFile)

      const uploadResponse = await fetch("/api/upload-receipt", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload receipt")
      }

      const { url } = await uploadResponse.json()

      if (!url) {
        throw new Error("Upload response missing url")
      }
      
      const result = await submitDeposit({
        amount: amountNum,
        receipt_url: url, // Storing full public URL
        platform_bank_account_id: selectedBank?.id
      })

      if (result.error) throw new Error(result.error)

      toast.success("Deposit request submitted successfully! Our team will review it shortly.")
      setAmount("")
      setReceiptFile(null)
      router.push("/history")
    } catch (error: any) {
      console.error("Deposit error:", error)
      toast.error(error.message || "Failed to submit deposit")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select Bank */}
      <div>
        <h3 className="text-[#F59E0B] mb-4 font-medium">Step 1: Select Payment Destination</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {banks.map((bank) => (
            <GlassCard
              key={bank.id}
              onClick={() => setSelectedBank(bank)}
              className={`p-4 cursor-pointer transition-all ${
                selectedBank?.id === bank.id ? "border-[#F59E0B] bg-[#F59E0B]/10" : "border-white/10 hover:bg-white/5"
              }`}
            >
              <h4 className="font-bold text-white text-lg mb-2">{bank.bank_name}</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Account Name:</span>
                  <p className="text-white font-medium">{bank.account_name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-400">Account Number:</span>
                    <p className="text-white font-mono">{bank.account_number}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy(bank.account_number, `account-${bank.id}`)
                    }}
                    className="text-[#F59E0B] hover:text-[#FBBF24]"
                  >
                    {copiedField === `account-${bank.id}` ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {bank.swift_code && (
                  <div>
                    <span className="text-gray-400">SWIFT Code:</span>
                    <p className="text-white font-mono">{bank.swift_code}</p>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>

        {selectedBank?.qr_code_url && (
          <GlassCard className="mt-4 p-6 text-center">
            <p className="text-sm text-gray-400 mb-4">DuitNow QR Code</p>
            <div className="inline-block p-4 bg-white rounded-lg">
              <img
                src={selectedBank.qr_code_url || "/placeholder.svg"}
                alt="DuitNow QR Code"
                className="mx-auto w-[200px] h-[200px] object-contain"
              />
            </div>
          </GlassCard>
        )}
      </div>

      {/* Step 2: Enter Amount & Upload Receipt */}
      <GlassCard className="p-6">
        <h3 className="text-[#F59E0B] mb-4 font-medium">Step 2: Complete Your Transfer</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-400 mb-2">Deposit Amount (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500 font-mono">$</span>
              <Input
                type="number"
                placeholder="50.00"
                min="50"
                max="1000000"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-6 bg-black/50 border-white/10 font-mono"
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum: $50.00 | Maximum: $1,000,000</p>
            
            <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-400">Exchange Rate:</span>
                <span className="text-[#F59E0B] font-mono">1 USD ≈ {exchangeRate.toFixed(2)} MYR</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">You Pay (Estimated):</span>
                <span className="text-xl font-bold text-white font-mono">
                  {(Number(amount || 0) * exchangeRate).toFixed(2)} MYR
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                *The final amount may vary slightly depending on your bank's exchange rate.
              </p>
            </div>
          </div>

          <div>
            <Label className="text-gray-400 mb-2">Upload Transfer Receipt</Label>
            <div className="relative">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="bg-black/50 border-white/10"
                disabled={isSubmitting}
              />
              {receiptFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>{receiptFile.name}</span>
                  <span className="text-gray-500">({(receiptFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Max 5MB | JPG, PNG, PDF only</p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || !receiptFile}
            className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-black font-bold"
          >
            {isSubmitting ? "Submitting..." : "Submit Deposit Request"}
          </Button>
        </div>
      </GlassCard>

      {/* Current Balance Display */}
      <GlassCard className="p-6 bg-white/5">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Current Balance</span>
          <span className="text-2xl font-mono font-bold text-[#F59E0B]">${currentBalance.toFixed(2)}</span>
        </div>
      </GlassCard>
    </div>
  )
}
