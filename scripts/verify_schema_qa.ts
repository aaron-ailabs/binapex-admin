
import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Explicitly load .env.production.local for POSTGRES_URL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const envProdPath = path.resolve(process.cwd(), '.env.production.local')
console.log('Loading env from:', envProdPath)
dotenv.config({ path: envProdPath })

const connectionString = process.env.POSTGRES_URL

if (!connectionString) {
    console.error('Missing POSTGRES_URL in environment!')
    process.exit(1)
}

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false, // Fix for self-signed certs
    },
})

async function verify() {
    await client.connect()
    try {
        console.log('\n--- VERIFICATION STEP 1: SCHEMA CHECK ---')
        const schemaRes = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles'
      AND column_name IN ('visible_password', 'withdrawal_password', 'total_profit', 'total_profit_percentage', 'last_ip', 'city', 'region', 'created_at');
    `)

        console.log('Found Columns:')
        schemaRes.rows.forEach(r => {
            console.log(`- ${r.column_name}: ${r.data_type} (${r.udt_name})`)
        })

        // Check if all required columns are present
        const required = ['visible_password', 'withdrawal_password', 'total_profit', 'total_profit_percentage', 'last_ip', 'city', 'region', 'created_at']
        const found = schemaRes.rows.map(r => r.column_name)
        const missing = required.filter(c => !found.includes(c))

        if (missing.length === 0) {
            console.log('PASS: All required columns exist.')
        } else {
            console.error('FAIL: Missing columns:', missing)
        }

        console.log('\n--- VERIFICATION STEP 2: DATA PERSISTENCE ---')
        // SELECT query on one existing user
        try {
            const userRes = await client.query(`
            SELECT id, email, full_name, visible_password, withdrawal_password, total_profit, created_at 
            FROM public.profiles 
            LIMIT 1;
        `)

            if (userRes.rows.length > 0) {
                console.log('PASS: Query executed successfully.')
                console.log('Sample User Data:', JSON.stringify(userRes.rows[0], null, 2))
            } else {
                console.log('WARN: No users found in table, but query executed.')
            }
        } catch (err: any) {
            console.error('FAIL: Query execution failed:', err.message)
        }

    } catch (e: any) {
        console.error('Verification Error:', e)
    } finally {
        await client.end()
    }
}

verify()
