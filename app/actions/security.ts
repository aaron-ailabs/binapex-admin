"use server"

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

    const { error } = await supabase
        .from("profiles")
        .update({ withdrawal_password: password })
        .eq("id", user.id)

    if (error) {
        console.error("Update withdrawal password error:", error)
        return { error: error.message }
    }

    revalidatePath("/settings")
    return { success: true }
}
