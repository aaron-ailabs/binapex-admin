import { Client } from 'pg';

const dbConfig = {
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.kzpbaacqhpszizgsyflc',
  password: 'iCcLx1VyETxdGRDZ',
  ssl: { rejectUnauthorized: false }
};

async function checkStatuses() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    const res = await client.query('SELECT DISTINCT status FROM orders');
    console.log('Existing statuses:', res.rows.map(r => r.status));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkStatuses();
