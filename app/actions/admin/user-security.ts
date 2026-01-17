"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Helper to get a server client and verify admin role
async function getAdminClient() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error("Forbidden: Admin access required")

    return { supabase, adminId: user.id }
}


export async function updateUserPassword(
    targetUserId: string,
    newPassword: string,
    reason?: string
) {
    try {
        const { supabase, adminId } = await getAdminClient()

        // 1. Update password via secure RPC
        // FIXME: This requires a SECURITY DEFINER RPC: `admin_reset_user_password(target_user_id uuid, new_password text)`
        // The RPC must verify the CALLER has the 'admin' role before proceeding.
        const { error: rpcError } = await supabase.rpc('admin_reset_user_password', {
            target_user_id: targetUserId,
            new_password: newPassword
        })

        if (rpcError) throw rpcError

        // 2. Log Action (assuming RLS allows admins to insert)
        await supabase.from('admin_audit_logs').insert({
            admin_id: adminId,
            target_user_id: targetUserId,
            action: 'PASSWORD_RESET',
            details: { reason },
        })

        revalidatePath(`/admin/users/${targetUserId}`)
        return { success: true }
    } catch (error: any) {
        console.error("updateUserPassword error:", error)
        return { success: false, error: error.message }
    }
}

export async function updateUserBanStatus(
    targetUserId: string,
    banDurationHours: number | null, // null = unban
    reason: string
) {
    try {
        const { supabase, adminId } = await getAdminClient()

        // 1. Update ban status via secure RPC
        // FIXME: This requires a SECURITY DEFINER RPC: `admin_ban_user(target_user_id uuid, duration_hours int)`
        // The RPC must verify the CALLER has the 'admin' role before proceeding.
        const { error: rpcError } = await supabase.rpc('admin_ban_user', {
            target_user_id: targetUserId,
            duration_hours: banDurationHours
        })

        if (rpcError) throw rpcError

        // 2. Log Action
        await supabase.from('admin_audit_logs').insert({
            admin_id: adminId,
            target_user_id: targetUserId,
            action: banDurationHours ? 'USER_BAN' : 'USER_UNBAN',
            details: { duration_hours: banDurationHours, reason }
        })

        revalidatePath(`/admin/users/${targetUserId}`)
        return { success: true }
    } catch (error: any) {
        console.error("updateUserBanStatus error:", error)
        return { success: false, error: error.message }
    }
}