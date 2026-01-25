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

async function reloadSchema() {
  console.log('--- Attempting to reload PostgREST schema ---');
  const { data, error } = await supabase.rpc('reload_postgrest_schema');
  if (error) {
    console.error('❌ Error calling reload_postgrest_schema:', error.message);
  } else {
    console.log('✅ Successfully triggered schema reload.');
  }
}

reloadSchema();
