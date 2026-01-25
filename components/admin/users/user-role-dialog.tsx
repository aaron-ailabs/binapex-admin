"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { adminUpdateUserRole } from "@/lib/admin-rpc"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type UserProfile = {
    id: string
    email: string
    full_name: string | null
    role: string
    status: string
}

interface UserRoleDialogProps {
    user: UserProfile | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function UserRoleDialog({ user, open, onOpenChange, onSuccess }: UserRoleDialogProps) {
    const [role, setRole] = useState<string>(user?.role || "trader")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    // Update local state when user prop changes
    if (user && user.role !== role && !isLoading && open) {
        // We don't auto-update here to avoid loops, rely on init or manual change
        // But effectively if dialog opens with new user, we want to reset.
        // Handled better by effect or key.
    }

    const handleSave = async () => {
        if (!user) return
        setIsLoading(true)
        try {
            const result = await adminUpdateUserRole(user.id, role)
            if (result.success) {
                toast.success("User role updated successfully")
                onOpenChange(false)
                router.refresh()
                onSuccess?.()
            } else {
                toast.error(result.error || "Failed to update role")
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit User Role</DialogTitle>
                    <DialogDescription>
                        Change the permission level for <strong>{user?.email}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                            Role
                        </Label>
                        <Select
                            value={role}
                            onValueChange={setRole}
                            defaultValue={user?.role || "trader"}
                        >
                            <SelectTrigger className="col-span-3 bg-card/50 border-white/10">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#121212] border-white/10 text-white">
                                <SelectItem value="trader">Trader</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="border-white/10 hover:bg-white/5">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading || role === user?.role}>
                        {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
