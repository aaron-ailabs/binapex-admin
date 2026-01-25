import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function checkLimitOrders() {
  console.log('Checking public.limit_orders table...');
  
  const { data, error } = await supabase
    .from('limit_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    if (error.code === '42P01') {
      console.log('Table public.limit_orders does not exist.');
    } else {
      console.error('Error fetching from limit_orders:', error);
    }
    return;
  }

  console.log(`Found ${data.length} limit orders.`);
  if (data.length > 0) {
    console.log('Latest limit order:', data[0]);
    
    const pending = data.filter(o => o.status === 'pending' || o.status === 'partially_filled');
    console.log(`Pending limit orders in sample: ${pending.length}`);
  }
}

checkLimitOrders();
