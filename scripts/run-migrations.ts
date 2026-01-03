
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function runMigrations() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!connectionString) {
        console.error("DATABASE_URL or POSTGRES_URL not found in environment")
        process.exit(1)
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase transaction pooler sometimes, or direct
    })

    try {
        await client.connect()
        console.log("Connected to database")

        const files = [
            'scripts/036_refactor_withdrawal_system.sql',
            'scripts/037_withdrawal_request_flow.sql'
        ]

        for (const file of files) {
            const filePath = path.join(process.cwd(), file)
            if (fs.existsSync(filePath)) {
                const sql = fs.readFileSync(filePath, 'utf8')
                console.log(`Running ${file}...`)
                await client.query(sql)
                console.log(`Success: ${file}`)
            } else {
                console.error(`File not found: ${file}`)
            }
        }

        console.log("All migrations completed.")
    } catch (err) {
        console.error("Migration error:", err)
    } finally {
        await client.end()
    }
}

runMigrations()
