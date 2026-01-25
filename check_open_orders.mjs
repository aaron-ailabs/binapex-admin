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

async function checkOpenOrders() {
  console.log('Checking for OPEN/pending orders in public.orders and public.limit_orders...');
  
  const { data: orders, error: error1 } = await supabase
    .from('orders')
    .select('id, user_id, status, type, created_at')
    .in('status', ['OPEN', 'pending']);

  if (error1) {
    console.error('Error fetching from orders:', error1);
  } else {
    console.log(`Found ${orders.length} open/pending orders in public.orders.`);
    if (orders.length > 0) {
      console.log('Sample:', orders[0]);
    }
  }

  const { data: limitOrders, error: error2 } = await supabase
    .from('limit_orders')
    .select('id, user_id, status, type, created_at')
    .in('status', ['pending', 'partially_filled']);

  if (error2) {
    console.error('Error fetching from limit_orders:', error2);
  } else {
    console.log(`Found ${limitOrders.length} pending limit orders.`);
    if (limitOrders.length > 0) {
      console.log('Sample:', limitOrders[0]);
    }
  }
}

checkOpenOrders();
