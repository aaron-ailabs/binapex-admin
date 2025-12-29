
import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Explicitly load .env.production.local for POSTGRES_URL, fallback to .env.local
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

async function applyRls() {
    await client.connect()
    try {
        console.log('Reading SQL file...')
        const sqlPath = path.resolve(process.cwd(), 'scripts/033_update_user_trigger.sql')
        const sql = fs.readFileSync(sqlPath, 'utf8')

        console.log('Applying RLS policies...')
        await client.query(sql)
        console.log('RLS Policies Applied Successfully.')

    } catch (e: any) {
        console.error('Migration Error:', e)
    } finally {
        await client.end()
    }
}

applyRls()
