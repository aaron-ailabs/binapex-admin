import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Credentials from env_prod_backup.txt
const dbConfig = {
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 6543, // Pooler port
  database: 'postgres',
  user: 'postgres.kzpbaacqhpszizgsyflc',
  password: 'iCcLx1VyETxdGRDZ',
  ssl: { rejectUnauthorized: false }
};

const migrations = [
  '20260112000001_trade_notifications.sql',
  '20260112000002_add_cron.sql',
  '20260112000003_update_binary_rpc.sql',
  '20260112000004_update_orders_status.sql',
  '20260112000005_signup_notifications.sql',
  '20260112000006_unify_binary_trading.sql'
];

async function applyMigrations() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected.');

    for (const migration of migrations) {
      const filePath = path.join(process.cwd(), 'supabase', 'migrations', migration);
      console.log(`Applying ${migration}...`);
      
      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`✅ Success: ${migration}`);
      } catch (err) {
        console.error(`❌ Failed: ${migration}`, err);
        // Continue? Or stop?
        // Some migrations might fail if objects already exist (though I used CREATE OR REPLACE)
        // We continue.
      }
    }

  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
    console.log('Done.');
  }
}

applyMigrations();
