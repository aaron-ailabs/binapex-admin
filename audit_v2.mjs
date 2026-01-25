import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const tablesToCheck = [
  'profiles',
  'assets',
  'trades',
  'executed_trades',
  'bank_accounts',
  'transactions',
  'support_messages',
  'admin_users',
  'system_settings',
  'admin_notifications',
  'user_notifications',
  'binary_trades',
  'orders'
];

async function audit() {
  console.log('--- Supabase Backend Audit v2 ---');
  
  for (const table of tablesToCheck) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Table '${table}': ${error.message}`);
    } else {
      console.log(`✅ Table '${table}': Exists (Count: ${count})`);
    }
  }

  // Check Realtime Publication via a hack (try to subscribe)
  // Actually, we can't easily check publication via SDK without listening
  
  // Check if we can read assets (common issue)
  const { data: assets, error: assetsError } = await supabase.from('assets').select('*').limit(1);
  if (assetsError) {
    console.log(`❌ Assets Read Error: ${assetsError.message}`);
  } else {
    console.log(`✅ Assets Read: Success`);
  }

  // Check support messages
  const { data: messages, error: msgError } = await supabase.from('support_messages').select('*').limit(1);
  if (msgError) {
    console.log(`❌ Support Messages Read Error: ${msgError.message}`);
  } else {
    console.log(`✅ Support Messages Read: Success`);
  }
}

audit();
