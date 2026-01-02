
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth-admin'
import bcrypt from 'bcrypt'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { admin, error: authError } = await verifyAdmin(supabase)

        if (authError || !admin) {
            return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 403 })
        }

        const { userId, newPassword, note } = await req.json()

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'Password too weak' }, { status: 400 })
        }

        const hash = await bcrypt.hash(newPassword, 10)

        // Update Profile
        // We need to make sure Admin can update ANY profile.
        // Standard RLS `profiles_update_own` prevents this.
        // We need a Service Role client here OR an Admin RLS policy.
        // Since we didn't add an Admin RLS policy for `profiles` UPDATE in migration (only for audit),
        // we should use a Service Role client.

        // Create Service Role Client
        const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                withdrawal_password: hash,
                withdrawal_password_set: true,
                withdrawal_password_last_reset: new Date().toISOString()
            })
            .eq('id', userId)

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 })
        }

        // Audit Log (can use user client if RLS allows, or admin client)
        // We used Admin RLS for audit table in migration "Admins can insert audit logs".
        // So `supabase` (user client) should work for audit.
        const { error: auditError } = await supabase
            .from('withdrawal_password_audit')
            .insert({
                user_id: userId,
                admin_id: admin.id,
                action: 'reset',
                note: note || 'Reset via Admin API'
            })

        if (auditError) {
            console.error('Audit log failed:', auditError)
        }

        // Notify User (Mocking notification for now as per plan/instruction "Notify user via email/SMS")
        // Implementation: In a real app, integrate email service here.
        console.log(`[Notification] Would send email to user ${userId}: Your withdrawal password was reset by admin.`)

        return NextResponse.json({ success: true })

    } catch (err: any) {
        console.error('Admin reset error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
