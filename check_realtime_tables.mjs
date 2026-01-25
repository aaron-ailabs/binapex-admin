import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealtime() {
  console.log('Checking Realtime Publications...');
  
  // Since we can't run arbitrary SQL easily, let's try to infer from system tables via PostgREST if possible,
  // or just check if we can subscribe to them.
  
  const tables = ['orders', 'limit_orders', 'support_messages', 'support_conversations', 'tickers', 'trades', 'executed_trades'];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`Table ${table}: Error or Not found (${error.message})`);
    } else {
      console.log(`Table ${table}: Found (${data ? 'has rows' : 'empty'})`);
    }
  }

  // To check if a table is in the publication, we really need SQL access.
  // Let's try to use the 'rpc' to run a query if there is one, or just assume we need to fix it in a migration.
  
  console.log('\nNote: To check publications and RLS status properly, we should run SQL:');
  console.log('1. SELECT * FROM pg_publication_tables WHERE pubname = \'supabase_realtime\';');
  console.log('2. SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = \'public\';');
}

checkRealtime();
