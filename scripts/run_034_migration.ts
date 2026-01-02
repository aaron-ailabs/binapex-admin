
import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const envProdPath = path.resolve(process.cwd(), '.env.production.local')
// If production local doesn't exist, try .env
if (!fs.existsSync(envProdPath)) {
    console.log('.env.production.local not found, checking .env')
    dotenv.config()
} else {
    console.log('Loading env from:', envProdPath)
    dotenv.config({ path: envProdPath })
}

const connectionString = process.env.POSTGRES_URL

if (!connectionString) {
    console.error('Missing POSTGRES_URL in environment!')
    process.exit(1)
}

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
})

async function runMigration() {
    await client.connect()
    try {
        const sqlPath = path.resolve(process.cwd(), 'scripts/034_withdrawal_password_schema.sql')
        const sql = fs.readFileSync(sqlPath, 'utf-8')

        console.log('Executing SQL from:', sqlPath)
        await client.query(sql)
        console.log('Migration executed successfully.')

    } catch (e: any) {
        console.error('Migration Error:', e)
    } finally {
        await client.end()
    }
}

runMigration()
