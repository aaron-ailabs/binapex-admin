"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/supabase" // Assuming database types exist, if not we will define inline for now or check types dir

// We define the types manually if not present in the generated types to ensure compilation
export interface AdminUserListItem {
    id: string
    email: string
    full_name: string | null
    role: string
    status: string
    created_at: string
    total_count: number
}

export interface AdminUserDetail {
    user_id: string
    email: string
    full_name: string
    role: string
    status: string
    created_at: string
    last_login: string
}

export async function adminListUsers(
    pageNum: number = 1,
    pageSize: number = 50,
    searchEmail: string | null = null
): Promise<{ data: AdminUserListItem[], error: any }> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('admin_list_users', {
        page_num: pageNum,
        page_size: pageSize,
        search_email: searchEmail
    })

    if (error) {
        console.error("Error fetching users:", error)
        return { data: [], error }
    }

    return { data: data || [], error: null }
}

export async function adminGetUserDetail(userId: string): Promise<{ data: AdminUserDetail | null, error: any }> {
    const supabase = await createClient()

    // rpc returns a SETOF, so we get an array, we want the first item
    const { data, error } = await supabase.rpc('admin_get_user_detail', {
        target_user_id: userId
    })

    if (error) {
        console.error("Error fetching user detail:", error)
        return { data: null, error }
    }

    const user = data && data.length > 0 ? data[0] : null
    return { data: user, error: null }
}

export async function adminUpdateUserRole(userId: string, newRole: string): Promise<{ success: boolean, message?: string, error?: string }> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: userId,
        new_role: newRole
    })

    if (error) {
        console.error("Error updating user role:", error)
        return { success: false, error: error.message }
    }

    return data as { success: boolean, message?: string, error?: string }
}

export async function adminFreezeUser(userId: string, shouldFreeze: boolean): Promise<{ success: boolean, message?: string, error?: string }> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('admin_freeze_user', {
        target_user_id: userId,
        should_freeze: shouldFreeze
    })

    if (error) {
        console.error("Error freezing/unfreezing user:", error)
        return { success: false, error: error.message }
    }

    return data as { success: boolean, message?: string, error?: string }
}
