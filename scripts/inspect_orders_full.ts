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

  console.log("\n--- Full Orders Schema ---")
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'orders' AND table_schema = 'public'
    ORDER BY ordinal_position
  `)
  console.table(res.rows)

  await client.end()
}

main().catch(console.error)
