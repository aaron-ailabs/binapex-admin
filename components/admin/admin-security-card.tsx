"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, RotateCcw, Lock, Unlock } from "lucide-react"
import type { Profile } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface AdminSecurityCardProps {
    user: Profile
    secret?: {
        password_plaintext: string
        failed_attempts: number
        is_locked: boolean
    } | null
}

export function AdminSecurityCard({ user, secret }: AdminSecurityCardProps) {
    const supabase = createClient()
    const [viewPasswordOpen, setViewPasswordOpen] = useState(false)
    const [retrievedPassword, setRetrievedPassword] = useState<string | null>(null)
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [newPassword, setNewPassword] = useState("")

    const handleViewPassword = async () => {
        try {
            const { data, error } = await supabase.rpc('admin_view_user_password', {
                target_uid: user.id
            })

            if (error) throw error

            setRetrievedPassword(data)
            setViewPasswordOpen(true)
        } catch (error: any) {
            toast.error(error.message || "Failed to retrieve password")
        }
    }

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }

        try {
            const { error } = await supabase.rpc('admin_reset_user_password', {
                target_uid: user.id,
                new_pwd: newPassword
            })

            if (error) throw error

            toast.success("Password reset and account unlocked")
            setResetDialogOpen(false)
            setNewPassword("")
            // In a real app, trigger a refresh here
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || "Failed to reset password")
        }
    }

    const isLocked = secret?.is_locked || false

    return (
        <GlassCard className="p-6">
            <h3 className="text-lg font-bold mb-4 text-[#F59E0B]">Withdrawal Security</h3>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isLocked ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                        {isLocked ? <Lock className="h-5 w-5 text-red-500" /> : <Unlock className="h-5 w-5 text-emerald-500" />}
                    </div>
                    <div>
                        <p className="font-medium text-white">{isLocked ? "ACCOUNT LOCKED" : "Active"}</p>
                        <p className="text-xs text-muted-foreground">
                            Failed Attempts: {secret?.failed_attempts || 0}/3
                        </p>
                    </div>
                </div>
                {isLocked && (
                    <Badge variant="destructive">LOCKED</Badge>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Button
                    variant="outline"
                    className="border-white/10 hover:bg-white/5"
                    onClick={handleViewPassword}
                >
                    <Eye className="h-4 w-4 mr-2" />
                    View Password
                </Button>

                <Button
                    variant="outline"
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-[#F59E0B]"
                    onClick={() => setResetDialogOpen(true)}
                >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset & Unlock
                </Button>
            </div>

            {/* View Password Dialog */}
            <Dialog open={viewPasswordOpen} onOpenChange={setViewPasswordOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Withdrawal Password</DialogTitle>
                        <DialogDescription>
                            This action has been logged in the admin audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 flex justify-center">
                        <div className="bg-muted p-4 rounded-lg border text-center min-w-[200px]">
                            <p className="text-2xl font-mono font-bold tracking-widest">
                                {retrievedPassword}
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Withdrawal Password</DialogTitle>
                        <DialogDescription>
                            This will set a new password and unlock the user's account if locked.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleResetPassword}>Reset Password</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </GlassCard>
    )
}
