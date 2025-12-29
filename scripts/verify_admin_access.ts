
import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Explicitly load .env.production.local for POSTGRES_URL matches app environment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
let envPath = path.resolve(process.cwd(), '.env.production.local')
if (!fs.existsSync(envPath)) {
    envPath = path.resolve(process.cwd(), '.env.local')
}
console.log('Loading env from:', envPath)
dotenv.config({ path: envPath })

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL

if (!connectionString) {
    console.error('Missing POSTGRES_URL or DATABASE_URL in environment!')
    process.exit(1)
}

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
})

async function checkData() {
    await client.connect()
    try {
        console.log('--- Checking Profiles Table Columns ---')
        const cols = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name IN ('visible_password', 'withdrawal_password', 'role');
        `)
        console.log('Columns present:', cols.rows.map(r => r.column_name))

        console.log('\n--- Checking Admin Users ---')
        const admins = await client.query(`SELECT id, email, role FROM public.profiles WHERE role = 'admin' LIMIT 5`)
        console.log('Admins found:', admins.rows)

        console.log('\n--- Checking Sample User Data (Password Fields) ---')
        const users = await client.query(`
            SELECT id, email, role, visible_password, withdrawal_password 
            FROM public.profiles 
            WHERE role != 'admin' OR role IS NULL 
            LIMIT 5
        `)
        console.log('Sample Users:', users.rows)

        if (users.rows.length > 0) {
            const u = users.rows[0]
            if (!u.visible_password && !u.withdrawal_password) {
                console.log('\nWARNING: Password fields are NULL for this user. This explains why they appear empty in UI.')
            }
        }

        console.log('\n--- Checking is_admin() Function ---')
        const funcCheck = await client.query(`
            SELECT proname, prosrc FROM pg_proc WHERE proname = 'is_admin';
        `)
        if (funcCheck.rows.length > 0) {
            console.log('is_admin function exists.')
            // console.log('Source:', funcCheck.rows[0].prosrc)
        } else {
            console.log('ERROR: is_admin function MISSING!')
        }

    } catch (e: any) {
        console.error('Error:', e)
    } finally {
        await client.end()
    }
}

checkData()
