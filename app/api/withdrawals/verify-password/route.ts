
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

export async function POST(req: Request) {
    try {
        const { userId, withdrawalPassword } = await req.json()

        if (!userId || !withdrawalPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = await createClient()

        // Verify the user is requesting for themselves using their session
        // Or if checking strictly by ID passed in body, ensure it matches session.
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (user.id !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Fetch hash from profiles
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('withdrawal_password')
            .eq('id', userId)
            .single()

        if (fetchError || !profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        if (!profile.withdrawal_password) {
            return NextResponse.json({ error: 'Withdrawal password not set' }, { status: 400 })
        }

        // Compare hash
        const match = await bcrypt.compare(withdrawalPassword, profile.withdrawal_password)

        if (!match) {
            // TODO: Rate limiting logic could go here (Redis or DB timestamp check)
            return NextResponse.json({ error: 'Error: Please contact customer service.' }, { status: 403 })
        }

        return NextResponse.json({ success: true })

    } catch (err: any) {
        console.error('Verify error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
