import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = pg;

async function auditRLS() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL_NON_POOLING,
        ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    try {
        const res = await client.query(`
      SELECT 
        tablename, 
        rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

        console.log('--- RLS Audit Report ---');
        const disabled: string[] = [];
        res.rows.forEach(row => {
            console.log(`${row.tablename.padEnd(30)}: ${row.rowsecurity ? '✅ ENABLED' : '❌ DISABLED'}`);
            if (!row.rowsecurity) disabled.push(row.tablename);
        });

        if (disabled.length > 0) {
            console.log('\n⚠️ ACTION REQUIRED: Enable RLS on these tables:', disabled.join(', '));
        } else {
            console.log('\n✅ All public tables have RLS enabled.');
        }
    } catch (err: any) {
        console.error('Audit error:', err.message);
    } finally {
        await client.end();
    }
}

auditRLS();
