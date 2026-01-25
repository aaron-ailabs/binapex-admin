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

async function checkAdminUsers() {
  const { data, error } = await supabase.from('admin_users').select('*');
  if (error) {
    console.log('❌ admin_users select failed:', error.message);
  } else {
    console.log('✅ admin_users data:', data);
  }
}

checkAdminUsers();
