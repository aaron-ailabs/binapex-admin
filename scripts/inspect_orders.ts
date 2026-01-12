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

  const cols = await client.query(
    `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='orders'
    ORDER BY ordinal_position;
  `,
  )

  const checks = await client.query(
    `
    SELECT conname, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname='public' AND t.relname='orders' AND c.contype='c';
  `,
  )

  const funcs = await client.query(
    `
    SELECT proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname='public' AND proname IN ('execute_binary_trade','settle_binary_order');
  `,
  )

  console.log("orders columns:")
  console.table(cols.rows)
  console.log("\norders check constraints:")
  console.table(checks.rows)
  console.log("\nrpc defs:")
  for (const f of funcs.rows) {
    console.log(`--- ${f.proname} ---`)
    console.log(f.def)
  }

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

