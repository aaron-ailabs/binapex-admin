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

  console.log('Checking for function definitions...')
  const funcs = await client.query(
    `
    SELECT proname, pg_get_functiondef(p.oid) AS def, pg_get_function_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname='public' AND proname IN ('place_trade', 'execute_binary_trade', 'settle_binary_order', 'admin_settle_trade');
  `,
  )

  if (funcs.rows.length === 0) {
      console.log("No functions found with those names.")
  }

  for (const f of funcs.rows) {
    console.log(`\n--- FUNCTION: ${f.proname} ---`)
    console.log(`Arguments: ${f.args}`)
    console.log(`Definition:\n${f.def}`)
  }

  await client.end()
}

main().catch(console.error)
