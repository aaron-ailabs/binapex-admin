import pkg from 'pg';
const { Client } = pkg;

async function testConnection() {
  const connectionString = 'postgresql://postgres.kzpbaacqhpszizgsyflc:postgres@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT current_database(), current_user');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
