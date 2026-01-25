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

async function checkFunction() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.log('❌ is_admin() call failed:', error.message);
  } else {
    console.log('✅ is_admin() exists and returned:', data);
  }
}

checkFunction();
