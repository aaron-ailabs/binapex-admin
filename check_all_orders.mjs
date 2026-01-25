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

async function checkAllOrders() {
  console.log('--- Checking All Orders ---');
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log(`Found ${data.length} orders.`);
    data.forEach(o => {
      console.log(`- ID: ${o.id}, User: ${o.user_id}, Symbol: ${o.asset_symbol}, Status: ${o.status}, Amount: ${o.amount}, Type: ${o.type}`);
    });
  }
}

checkAllOrders();