import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExecuteSql() {
  console.log('--- Testing execute_sql RPC ---');
  const { data, error } = await supabase.rpc('execute_sql', { sql_text: 'SELECT 1' });
  if (error) {
    console.log('❌ execute_sql failed:', error.message, error.code);
  } else {
    console.log('✅ execute_sql works! Data:', data);
  }
}

testExecuteSql();
