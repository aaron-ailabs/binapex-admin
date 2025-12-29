
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load env
const envPath = fs.existsSync(path.resolve(process.cwd(), '.env.production.local'))
    ? path.resolve(process.cwd(), '.env.production.local')
    : path.resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function verifySync() {
    const testEmail = `test_sync_${Date.now()}@example.com`
    const testPass = 'SyncTestPassword123!'

    console.log(`1. Creating test user: ${testEmail} with metadata password...`)

    // Simulate Signup with Metadata
    const { data: user, error } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPass,
        email_confirm: true,
        user_metadata: {
            full_name: 'Sync Test User',
            visible_password: testPass // This is what the signup form sends now
        }
    })

    if (error) {
        console.error('Failed to create user:', error.message)
        process.exit(1)
    }

    console.log('User created. Waiting for trigger...')
    await new Promise(r => setTimeout(r, 2000)) // Wait for trigger

    console.log('2. Checking Profile table...')
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('visible_password')
        .eq('id', user.user.id)
        .single()

    if (profileError) {
        console.error('Failed to fetch profile:', profileError.message)
        process.exit(1)
    }

    console.log(`Profile Password: "${profile.visible_password}"`)
    console.log(`Expected:         "${testPass}"`)

    if (profile.visible_password === testPass) {
        console.log('✅ SUCCESS: Password synced correctly via Trigger!')
    } else {
        console.error('❌ FAILURE: Password mismatch!')
        process.exit(1)
    }

    // Cleanup
    console.log('3. Cleaning up test user...')
    await supabase.auth.admin.deleteUser(user.user.id)
}

verifySync()
