import { Client } from "pg"

const dbConfig = {
  host: "aws-1-us-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  user: "postgres.kzpbaacqhpszizgsyflc",
  password: "iCcLx1VyETxdGRDZ",
  ssl: { rejectUnauthorized: false },
}

async function main() {
  const client = new Client(dbConfig)
  await client.connect()

  const tables = ['trades', 'orders', 'wallets', 'profiles']
  
  for (const table of tables) {
    const res = await client.query(`SELECT count(*) FROM public.${table}`)
    console.log(`Table ${table} has ${res.rows[0].count} rows.`)
  }

  console.log("\n--- Wallets Schema ---")
  const walletCols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wallets' AND table_schema = 'public'`)
  console.table(walletCols.rows)

  console.log("\n--- Profiles Balance Schema ---")
  const profileCols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND table_schema = 'public' AND column_name LIKE '%balance%'`)
  console.table(profileCols.rows)

  await client.end()
}

main().catch(console.error)
