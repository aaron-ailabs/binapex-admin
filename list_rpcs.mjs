import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listRPCs() {
  console.log('--- Checking for RPCs ---');
  
  // Try to query the internal schema cache if possible, 
  // but Postgrest usually hides this.
  // Instead, we'll try common RPC names.
  
  const commonRPCs = [
    'execute_sql',
    'pg_exec',
    'get_tables',
    'get_policies',
    'exec_sql',
    'query_sql',
    'run_sql'
  ];

  for (const rpc of commonRPCs) {
    const { data, error } = await supabase.rpc(rpc, { query: 'SELECT 1', sql: 'SELECT 1' });
    if (error && error.code === 'PGRST202') {
      // 202 means function not found
      console.log(`❌ RPC '${rpc}': Not found`);
    } else if (error) {
      console.log(`🟡 RPC '${rpc}': Found but error: ${error.message} (${error.code})`);
    } else {
      console.log(`✅ RPC '${rpc}': Found and works!`);
    }
  }
}

listRPCs();
