'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
export async function updateWithdrawalPassword(password: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    if (!password || password.length < 6) {
        return { error: "Withdrawal password must be at least 6 characters" }
    }

    try {
        // Upsert into user_withdrawal_secrets (Plaintext storage as per requirements)
        // Reset failed_attempts and is_locked on NEW password set?
        // Usually yes, if user is setting it.
        // But what if a hacker resets it?
        // This endpoint verifies Auth (Login). So if they are logged in, they can reset it.
        // We will reset locks.

        const { error } = await supabase
            .from("user_withdrawal_secrets")
            .upsert({
                user_id: user.id,
                password_plaintext: password,
                failed_attempts: 0,
                is_locked: false,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

        if (error) {
            console.error("Update withdrawal password error:", error)
            return { error: error.message }
        }

        revalidatePath("/settings")
        revalidatePath("/withdrawal")
        return { success: true }
    } catch (error: any) {
        console.error("Security update error:", error)
        return { error: "Failed to process security update" }
    }
}
