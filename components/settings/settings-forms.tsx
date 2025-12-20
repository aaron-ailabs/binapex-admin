"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/types/database"
import { AvatarUpload } from "@/components/settings/avatar-upload"

interface SettingsFormsProps {
  user: User
  profile: Profile | null
}

export function SettingsForms({ user, profile }: SettingsFormsProps) {
  const router = useRouter()
  const supabase = createClient()

  // Profile form state
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [phone, setPhone] = useState(profile?.phone || "")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const handleUpdateProfile = async () => {
    if (!fullName) {
      toast.error("Full name is required")
      return
    }

    setIsUpdatingProfile(true)

    try {
      const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id)

      if (error) throw error

      toast.success("Profile updated successfully")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile")
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setIsUpdatingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) throw error

      toast.success("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast.error(error.message || "Failed to update password")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-6">


// ... inside component ...

      {/* Profile Information */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold mb-6">Profile Information</h3>
        
        <div className="mb-8 flex justify-center">
            <AvatarUpload 
                userId={user.id} 
                avatarUrl={profile?.avatar_url || null} 
                fullName={profile?.full_name || ""} 
            />
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-400 mb-2">Email</Label>
            <Input value={user.email} disabled className="bg-black/50 border-white/10 text-gray-500" />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label className="text-gray-400 mb-2">Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="bg-black/50 border-white/10"
              disabled={isUpdatingProfile}
            />
          </div>

          <div>
            <Label className="text-gray-400 mb-2">Phone Number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+60 12 345 6789"
              className="bg-black/50 border-white/10"
              disabled={isUpdatingProfile}
            />
          </div>

          <Button
            onClick={handleUpdateProfile}
            disabled={isUpdatingProfile}
            className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-black font-bold"
          >
            {isUpdatingProfile ? "Updating..." : "Update Profile"}
          </Button>
        </div>
      </GlassCard>

      {/* Change Password */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-400 mb-2">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="bg-black/50 border-white/10"
              disabled={isUpdatingPassword}
            />
          </div>

          <div>
            <Label className="text-gray-400 mb-2">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="bg-black/50 border-white/10"
              disabled={isUpdatingPassword}
            />
          </div>

          <Button
            onClick={handleUpdatePassword}
            disabled={isUpdatingPassword}
            className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-black font-bold"
          >
            {isUpdatingPassword ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </GlassCard>

      {/* Account Information */}
      <GlassCard className="p-6 bg-white/5">
        <h3 className="text-xl font-bold mb-4">Account Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-400">User ID</p>
            <p className="text-sm font-mono text-white">{user.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Account Created</p>
            <p className="text-sm text-white">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Membership Tier</p>
            <p className="text-sm text-white capitalize">{profile?.membership_tier || "Silver"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">KYC Status</p>
            <p className="text-sm text-white">{profile?.kyc_verified ? "Verified" : "Not Verified"}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
