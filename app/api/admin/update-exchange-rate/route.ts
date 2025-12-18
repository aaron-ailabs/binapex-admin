import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateExchangeRateSchema = z.object({
  rate: z.number().min(2.0).max(10.0)
})

export async function POST(request: NextRequest) {
  try {
    // Verify admin access using regular client
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse and validate request
    const body = await request.json()
    const validation = updateExchangeRateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid rate value',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { rate } = validation.data

    // Use authenticated client for database operations (RLS enforced)
    // const adminSupabase = createAdminClient()

    // Get current value for audit
    const { data: currentSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'myr_exchange_rate')
      .single()

    const oldValue = currentSetting?.value || null

    // Update system_settings using upsert (handles missing row)
    const { error: updateError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'myr_exchange_rate',
        value: rate.toString(),
        description: 'USD to MYR exchange rate for deposits/withdrawals',
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })

    if (updateError) {
      console.error('Error updating exchange rate:', updateError)
      return NextResponse.json({
        error: `Failed to update exchange rate: ${updateError.message}`
      }, { status: 500 })
    }

    // Log admin action to audit logs
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: user.id,
        action: 'update_exchange_rate',
        entity_type: 'SETTINGS',
        entity_id: 'myr_exchange_rate',
        old_values: oldValue ? { rate: oldValue } : null,
        new_values: { rate: rate.toString() },
        metadata: {
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent')
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Exchange rate updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error updating exchange rate:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}