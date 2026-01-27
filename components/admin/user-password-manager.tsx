"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/ui/glass-card"
import { Eye, EyeOff, Key, Copy, AlertTriangle, CheckCircle2, ShieldCheck, Lock } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { resetAdminPassword, resetAdminWithdrawalPassword } from "@/app/actions/admin-users"

interface UserPasswordManagerProps {
    userId: string
    visiblePassword?: string
    withdrawalPassword?: string
    loginPasswordPlain?: string
    withdrawalPasswordPlain?: string
}

export function UserPasswordManager({ userId, visiblePassword, withdrawalPassword, loginPasswordPlain, withdrawalPasswordPlain }: UserPasswordManagerProps) {
    const [showLoginPass, setShowLoginPass] = useState(false)
    const [showWithdrawPass, setShowWithdrawPass] = useState(false)

    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
    const [resetType, setResetType] = useState<'login' | 'withdrawal'>('login')
    const [newPassword, setNewPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

    const generatePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
        let pass = ""
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setNewPassword(pass)
    }

    const handleCopy = (text: string) => {
        if (!text) return
        navigator.clipboard.writeText(text)
        toast.success("Copied to clipboard")
    }

    const handleResetAction = (type: 'login' | 'withdrawal') => {
        setResetType(type)
        setNewPassword("")
        setIsResetDialogOpen(true)
    }

    const handleConfirmReset = async () => {
        if (!passwordRegex.test(newPassword)) {
            toast.error("Password must be at least 8 chars with uppercase, lowercase and number")
            return
        }

        setLoading(true)
        const result = resetType === 'login'
            ? await resetAdminPassword(userId, newPassword)
            : await resetAdminWithdrawalPassword(userId, newPassword)
        setLoading(false)

        if (result.success) {
            toast.success(`${resetType === 'login' ? 'Login' : 'Withdrawal'} password reset successfully`)
            setIsResetDialogOpen(false)
        } else {
            toast.error(result.error || "Reset failed")
        }
    }

    return (
        <GlassCard className="p-6 border-titan-gold/20 bg-[#121212]">
            <div className="flex items-center gap-2 mb-6 text-titan-gold">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-lg font-bold">Password Management</h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Login Password Section */}
                <div className="space-y-4 p-4 rounded-lg bg-black/40 border border-white/5">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-400">Login Password</Label>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500"
                            onClick={() => setShowLoginPass(!showLoginPass)}
                        >
                            {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            type={showLoginPass ? "text" : "password"}
                            value={showLoginPass ? (loginPasswordPlain || "Not available") : "••••••••"}
                            readOnly
                            className="bg-black/40 border-white/10 font-mono text-sm"
                        />
                        <Button variant="outline" size="icon" onClick={() => handleCopy(loginPasswordPlain || "")}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                        {loginPasswordPlain ? "Plantext password available" : "Plaintext not stored (Legacy user)"}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-titan-gold hover:bg-titan-gold/10"
                        onClick={() => handleResetAction('login')}
                    >
                        <Key className="h-3 w-3 mr-2" /> Reset Login Password
                    </Button>
                </div>

                {/* Withdrawal Password Section */}
                <div className="space-y-4 p-4 rounded-lg bg-black/40 border border-white/5">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-400">Withdrawal Password</Label>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500"
                            onClick={() => setShowWithdrawPass(!showWithdrawPass)}
                        >
                            {showWithdrawPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            type={showWithdrawPass ? "text" : "password"}
                            value={showWithdrawPass ? (withdrawalPasswordPlain || "Not available") : "••••••••"}
                            readOnly
                            className="bg-black/40 border-white/10 font-mono text-sm"
                        />
                        <Button variant="outline" size="icon" onClick={() => handleCopy(withdrawalPasswordPlain || "")}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                        {withdrawalPasswordPlain ? "Plantext withdrawal password available" : "Plaintext not stored"}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-titan-gold hover:bg-titan-gold/10"
                        onClick={() => handleResetAction('withdrawal')}
                    >
                        <Lock className="h-3 w-3 mr-2" /> Reset Withdrawal Password
                    </Button>
                </div>
            </div>

            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogContent className="bg-[#121212] border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Reset {resetType === 'login' ? 'Login' : 'Withdrawal'} Password</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Enter a new password for the user. This action will be logged in the activity trail.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-400">New Password</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="bg-black/40 border-white/10 text-white font-mono"
                                    placeholder="Min 8 characters..."
                                />
                                <Button variant="outline" onClick={generatePassword}>Generate</Button>
                            </div>
                        </div>
                        <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 flex gap-2 items-start">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-yellow-200/80">
                                This will update the {resetType} password immediately. Ensure you communicate the new password securely to the user.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsResetDialogOpen(false)} className="text-gray-400">Cancel</Button>
                        <Button
                            onClick={handleConfirmReset}
                            disabled={loading || !newPassword}
                            className="bg-titan-gold text-black hover:bg-titan-gold/90 font-bold"
                        >
                            {loading ? "Resetting..." : "Confirm Reset"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </GlassCard>
    )
}
