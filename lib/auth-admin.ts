
import { SupabaseClient } from '@supabase/supabase-js'

export async function verifyAdmin(supabase: SupabaseClient) {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        return { admin: null, error: 'Unauthorized' }
    }

    // Try RPC first
    const { data: role, error: roleError } = await supabase.rpc('get_user_role')

    if (!roleError && role === 'admin') {
        return { admin: user, error: null }
    }

    // Fallback to profiles table
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role === 'admin') {
        return { admin: user, error: null }
    }

    return { admin: null, error: 'Forbidden' }
}
