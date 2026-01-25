
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), '.env.local');
try {
  const envFile = readFileSync(envPath, 'utf-8');
  const envConfig = config({ path: envPath }).parsed;
  if (envConfig) {
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
  }
} catch (error) {
    // ignore
}


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL and service role key are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAdmin() {
  try {
    const { data, error } = await supabase.rpc('verify_admin_user_by_email', { p_email: 'admin88@binapex.my' });

    if (error) {
      throw error;
    }

    if (data === true) {
      console.log('Admin user admin88@binapex.my found in admin_users table.');
    } else {
      console.log('Admin user admin88@binapex.my not found in admin_users table.');
    }
  } catch (error) {
    console.error('Error verifying admin user:', error.message);
  }
}

verifyAdmin();
