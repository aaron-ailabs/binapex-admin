import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

async function applyAuditor() {
  const sql = fs.readFileSync(path.resolve(__dirname, 'supabase/migrations/20260124000000_backend_auditor.sql'), 'utf8');
  
  // Since there's no direct 'query' method in Supabase JS client,
  // we have to hope there's an RPC that can run SQL, 
  // or we use the 'postgres' package if we had the connection string.
  
  // Wait, I don't have the connection string, only the API key.
  // I'll try to use a common trick: check if 'exec_sql' or similar RPC exists.
  
  console.log('Checking for SQL execution RPC...');
  const { data: rpcs, error: rpcError } = await supabase.rpc('list_rpcs'); // If this exists
  
  // If no RPC, I'll try to run it via a temporary function if I can find a way.
  // Actually, the best way is to check if I can find a migration script that I can repurpose.
}

// Alternatively, let's just try to call the auditor and see if it was already applied by some chance.
async function callAuditor() {
  console.log('Attempting to call public.audit_backend_system()...');
  const { data, error } = await supabase.rpc('audit_backend_system');
  
  if (error) {
    console.error('Auditor not found or error:', error.message);
    return null;
  }
  
  return data;
}

async function main() {
  const data = await callAuditor();
  if (data) {
    fs.writeFileSync('audit_results.json', JSON.stringify(data, null, 2));
    console.log('Audit results saved to audit_results.json');
    
    // Process results
    console.log('\n--- AUDIT SUMMARY ---');
    console.log('Tables found:', data.tables?.length || 0);
    console.log('Realtime tables:', data.realtime_publication?.length || 0);
    console.log('RLS Policies:', data.policies?.length || 0);
    
    const ordersTable = data.tables?.find(t => t.table_name === 'orders');
    console.log('Orders RLS enabled:', ordersTable?.row_security === 'true' || ordersTable?.row_security === true);
    
    const realtimePubs = data.realtime_publication?.map(p => p.table_name);
    console.log('Realtime Publication Tables:', realtimePubs);
  }
}

main();
