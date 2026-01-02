
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.production.local for POSTGRES_URL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const envProdPath = path.resolve(process.cwd(), '.env.production.local')
dotenv.config({ path: envProdPath })

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL

async function formatQuery(client: Client, query: string, params: any[] = []) {
    const res = await client.query(query, params);
    return res.rows;
}

async function audit() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        console.log("\n--- Checking 'profiles' columns ---");
        const profilesColumns = await formatQuery(client, `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name IN ('withdrawal_password', 'withdrawal_password_set', 'withdrawal_password_last_reset');
    `);
        console.log(JSON.stringify(profilesColumns, null, 2));

        console.log("\n--- Checking 'withdrawal_password_audit' existence and columns ---");
        const auditColumns = await formatQuery(client, `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'withdrawal_password_audit';
    `);
        console.log(JSON.stringify(auditColumns, null, 2));

        console.log("\n--- Checking RLS Policies ---");
        const policies = await formatQuery(client, `
      SELECT tablename, policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('profiles', 'withdrawal_password_audit');
    `);
        console.log(JSON.stringify(policies, null, 2));

    } catch (err) {
        console.error("Audit failed:", err);
    } finally {
        await client.end();
    }
}

audit();
