"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/ui/glass-card"
import { Eye, EyeOff, Key, Copy, AlertTriangle, CheckCircle2 } from "lucide-react"
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
import { updateUserPassword } from "@/app/actions/admin/user-security"

interface UserPasswordManagerProps {
    userId: string
    // visiblePassword removed for security
}

export function UserPasswordManager({ userId }: UserPasswordManagerProps) {
    const [showPassword, setShowPassword] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [generated, setGenerated] = useState(false)

    // Password Complexity Regex: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

    const generatePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&"
        // Ensure at least one of each required type
        const u = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        const l = "abcdefghijklmnopqrstuvwxyz"
        const n = "0123456789"
        const s = "@$!%*?&"

        let pass = ""
        pass += u.charAt(Math.floor(Math.random() * u.length))
        pass += l.charAt(Math.floor(Math.random() * l.length))
        pass += n.charAt(Math.floor(Math.random() * n.length))
        pass += s.charAt(Math.floor(Math.random() * s.length))

        for (let i = 0; i < 8; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        // Shuffle
        pass = pass.split('').sort(() => 0.5 - Math.random()).join('')

        setNewPassword(pass)
        setGenerated(true)
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success("Copied to clipboard")
    }

    const handleReset = async () => {
        if (!passwordRegex.test(newPassword)) {
            toast.error("Password does not meet complexity requirements (Min 8 chars, Uppercase, Lowercase, Number, Symbol)")
            return
        }

        setLoading(true)
        const result = await updateUserPassword(userId, newPassword, "Admin manual reset")
        setLoading(false)

        if (result.success) {
            toast.success("Password updated successfully")
            setIsDialogOpen(false)
            setNewPassword("")
            setGenerated(false)
        } else {
            toast.error(result.error || "Failed to update password")
        }
    }

    return (
        <GlassCard className="p-6 border-orange-500/20">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-orange-400">
                    <Key className="h-5 w-5" />
                    <h3 className="text-lg font-bold">Security & Access</h3>
                </div>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20"
                >
                    Reset Password
                </Button>
            </div>

            <div className="space-y-4">
                <div>
                    <Label className="text-muted-foreground mb-2 block">Security Policy</Label>
                    <div className="bg-black/40 border border-white/5 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">
                            User passwords are encrypted and secure. Administrators cannot view current passwords.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Use the "Reset Password" button above if the user has lost access.
                        </p>
                    </div>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reset User Password</DialogTitle>
                        <DialogDescription>
                            This will force-update the user's login password. **Note: This password will NOT be stored in the database.**
                            You must copy it now to provide it to the user.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="font-mono bg-black/20"
                                    placeholder="Enter new password..."
                                />
                                <Button variant="outline" onClick={generatePassword}>Generate</Button>
                            </div>
                        </div>

                        {newPassword && (
                            <div className="bg-muted p-3 rounded-md text-sm border flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                <span>Be sure to copy this password to share with the user securely.</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleReset}
                            disabled={loading || !newPassword}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {loading ? "Updating..." : "Confirm Reset"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </GlassCard>
    )
}
