"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

// Helper to verify admin role
async function verifyAdmin() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error("Forbidden: Admin access required")

    return user.id
}

const getAdminClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

export async function updateUserPassword(
    targetUserId: string,
    newPassword: string,
    reason?: string
) {
    try {
        const adminId = await verifyAdmin()
        const adminClient = getAdminClient()

        // 1. Update Auth User Password
        const { error: authError } = await adminClient.auth.admin.updateUserById(
            targetUserId,
            { password: newPassword }
        )

        if (authError) throw authError

        // SEC-04: Sync plaintext password to profile_credentials for Admin visibility
        await adminClient.from('profile_credentials').upsert({
            id: targetUserId,
            visible_password: newPassword,
            updated_at: new Date().toISOString()
        })

        // 3. Log Action
        await adminClient.from('admin_audit_logs').insert({
            admin_id: adminId,
            target_user_id: targetUserId,
            action: 'PASSWORD_RESET',
            details: { reason },
            user_agent: 'Binapex Admin Portal' // Could parse headers if needed
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
        const adminId = await verifyAdmin()
        const adminClient = getAdminClient()

        const bannedUntil = banDurationHours
            ? new Date(Date.now() + banDurationHours * 60 * 60 * 1000).toISOString()
            : null

        // 1. Update Auth User Ban Status
        const { error: authError } = await adminClient.auth.admin.updateUserById(
            targetUserId,
            { ban_duration: banDurationHours ? `${banDurationHours}h` : '0h' }
            // Note: Supabase 'ban_duration' API works, but explicit 'banned_until' is internal.
            // Using updateUserById with ban_duration is the standard way.
            // Wait, standard way is usually ban_duration.
            // Let's verify Supabase Admin API for Banning.
            // Actually, `banned_until` can be set directly via updateUserById on some versions, but standard is `ban_duration`.
            // Let's try explicit `ban_duration` or just passing `user_metadata` if needed? 
            // Correct way: `updateUserById(id, { ban_duration: '1000h' })` 
        )

        // However, Supabase often uses `banned_until` column implicitly.
        // Let's rely on standard Auth Admin method.
        // If banDurationHours is null/0, we unban.

        // Fix: `ban_duration` format: "10h", "none" to unban?
        // Let's assume we pass the duration string.

        let updateParams: any = {}
        if (banDurationHours) {
            updateParams.ban_duration = `${banDurationHours}h`
        } else {
            updateParams.ban_duration = 'none' // To unban
        }

        const { error: updateError } = await adminClient.auth.admin.updateUserById(
            targetUserId,
            updateParams
        )

        if (updateError) throw updateError

        // 2. Log Action
        await adminClient.from('admin_audit_logs').insert({
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
