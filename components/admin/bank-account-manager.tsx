"use client"

import type React from "react"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Upload, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useLiveData } from "@/hooks/use-live-data"
import { revalidateBanks } from "@/app/actions/admin-banking"

interface BankAccountManagerProps {
  accounts: any[]
}

export function BankAccountManager({ accounts: initialAccounts }: BankAccountManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const accounts = useLiveData("platform_bank_accounts", initialAccounts, { column: "display_order", ascending: true })
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [qrFile, setQrFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    is_active: true,
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed")
        return
      }
      setQrFile(file)
    }
  }

  const handleSubmit = async () => {
    if (!formData.bank_name || !formData.account_name || !formData.account_number) {
      toast.error("Please fill in all fields")
      return
    }

    setIsSubmitting(true)
    try {
      let qrCodeUrl: string | null = null

      // Upload QR code if provided
      if (qrFile) {
        const fileExt = qrFile.name.split(".").pop()
        const fileName = `bank_${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("platform_qr_codes")
          .upload(fileName, qrFile)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("platform_qr_codes").getPublicUrl(fileName)
        qrCodeUrl = publicUrl
      }

      if (editingId) {
        // Update existing
        const updateData: any = { ...formData }
        if (qrCodeUrl) updateData.qr_code_url = qrCodeUrl

        const { error } = await supabase.from("platform_bank_accounts").update(updateData).eq("id", editingId)

        if (error) throw error
        toast.success("Bank account updated")
      } else {
        // Create new
        const { error } = await supabase.from("platform_bank_accounts").insert({
          ...formData,
          qr_code_url: qrCodeUrl,
          display_order: accounts.length,
        })

        if (error) throw error
        toast.success("Bank account added")
      }

      // Reset form
      setFormData({
        bank_name: "",
        account_name: "",
        account_number: "",
        is_active: true,
      })
      setQrFile(null)
      setIsAdding(false)
      setEditingId(null)
      await revalidateBanks()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save bank account")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (account: any) => {
    setFormData({
      bank_name: account.bank_name,
      account_name: account.account_name,
      account_number: account.account_number,
      is_active: account.is_active,
    })
    setEditingId(account.id)
    setIsAdding(true)
  }

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return

    try {
      const { error } = await supabase.from("platform_bank_accounts").delete().eq("id", accountId)

      if (error) throw error
      toast.success("Bank account deleted")
      await revalidateBanks()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete bank account")
    }
  }

  const toggleActive = async (accountId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("platform_bank_accounts").update({ is_active: !currentStatus }).eq("id", accountId)

      if (error) throw error
      toast.success(`Account ${!currentStatus ? "activated" : "deactivated"}`)
      await revalidateBanks()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update account status")
    }
  }

  return (
    <div className="space-y-6">
      {/* Add New Button */}
      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black">
          <Plus className="h-4 w-4 mr-2" />
          Add Bank Account
        </Button>
      )}

      {/* Add/Edit Form */}
      {isAdding && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold mb-4">{editingId ? "Edit" : "Add"} Bank Account</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-gray-400 mb-2">Bank Name</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="e.g. Maybank"
                className="bg-black/50 border-white/10"
              />
            </div>
            <div>
              <Label className="text-gray-400 mb-2">Account Name</Label>
              <Input
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="e.g. BINAPEX SDN BHD"
                className="bg-black/50 border-white/10"
              />
            </div>
            <div>
              <Label className="text-gray-400 mb-2">Account Number</Label>
              <Input
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="e.g. 1234567890"
                className="bg-black/50 border-white/10"
              />
            </div>
            <div>
              <Label className="text-gray-400 mb-2">QR Code (DuitNow)</Label>
              <label className="flex items-center justify-center w-full h-10 border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-[#F59E0B]/50 transition-colors bg-black/30">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Upload className="h-4 w-4" />
                  {qrFile ? qrFile.name : "Upload QR Code"}
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black"
            >
              {isSubmitting ? "Saving..." : editingId ? "Update" : "Add"} Account
            </Button>
            <Button
              onClick={() => {
                setIsAdding(false)
                setEditingId(null)
                setFormData({
                  bank_name: "",
                  account_name: "",
                  account_number: "",
                  is_active: true,
                })
                setQrFile(null)
              }}
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Accounts List */}
      <div className="grid gap-4">
        {accounts.map((account: any) => (
          <GlassCard key={account.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Bank</p>
                  <p className="text-white font-bold">{account.bank_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Account Name</p>
                  <p className="text-white">{account.account_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Account Number</p>
                  <p className="text-white font-mono">{account.account_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Badge
                  variant="outline"
                  className={
                    account.is_active
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  }
                >
                  {account.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => toggleActive(account.id, account.is_active)}>
                  {account.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(account.id)}
                  className="text-red-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {account.qr_code_url && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">DuitNow QR Code</p>
                <img
                  src={account.qr_code_url || "/placeholder.svg"}
                  alt="QR Code"
                  className="w-32 h-32 rounded-lg border border-white/10"
                />
              </div>
            )}
          </GlassCard>
        ))}
        {accounts.length === 0 && (
          <GlassCard className="p-12 text-center">
            <p className="text-gray-400">No bank accounts added yet</p>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
