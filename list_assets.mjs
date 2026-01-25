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

async function listAssets() {
  console.log('--- Listing Assets ---');
  const { data, error } = await supabase.from('assets').select('*');
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log(`Found ${data.length} assets.`);
    data.forEach(a => console.log(`- ${a.symbol} (${a.name}): ID ${a.id}, Active: ${a.is_active}`));
  }
}

listAssets();