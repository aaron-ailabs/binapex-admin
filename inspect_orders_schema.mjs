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

async function inspectOrdersTable() {
  console.log('Inspecting public.orders table structure...');
  
  // Try to get one row to see columns
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching from orders:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in public.orders:', Object.keys(data[0]));
    console.log('Sample data:', data[0]);
  } else {
    console.log('No data in orders table to inspect columns.');
    
    // Fallback: try to use a query that will fail but show columns in error (if possible)
    // or just check schema if we had a better way.
  }
}

inspectOrdersTable();
