
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth-admin'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const supabase = await createClient()
        const { admin, error: authError } = await verifyAdmin(supabase)

        if (authError || !admin) {
            return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 403 })
        }

        // Await params as required in Next.js 15+
        const { userId } = await params

        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('withdrawal_password')
            .eq('id', userId)
            .single()

        if (fetchError || !profile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Audit Log
        // Using service role might be needed if RLS blocks insert, but we added RLS for admin.
        // However, verifyAdmin uses `supabase` (user client).
        // Let's try inserting with user client.
        const { error: auditError } = await supabase
            .from('withdrawal_password_audit')
            .insert({
                user_id: userId,
                admin_id: admin.id,
                action: 'view',
                note: 'Viewed hash via Admin API'
            })

        if (auditError) {
            console.error('Audit log failed:', auditError)
            // We might choose to fail the request or proceed. Proceeding but logging error.
        }

        return NextResponse.json({ withdrawal_password_hash: profile.withdrawal_password })

    } catch (err: any) {
        console.error('Admin view hash error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
