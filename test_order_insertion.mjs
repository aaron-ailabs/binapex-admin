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

async function testOrderInsertion() {
  console.log('Testing insertion into public.orders...');
  
  // Try to insert a minimal order
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: 'feb39302-19db-4c07-bc61-1c4bb4ddd54a', // A known user ID from previous scripts
      asset_symbol: 'BTC/USD',
      direction: 'UP',
      amount: 10,
      strike_price: 50000,
      payout_rate: 85,
      status: 'OPEN',
      type: 'binary'
    })
    .select();

  if (error) {
    console.error('❌ Insertion failed:', error.message);
    console.error('Error details:', error);
  } else {
    console.log('✅ Insertion successful:', data);
    
    // Clean up
    const { error: delError } = await supabase
      .from('orders')
      .delete()
      .eq('id', data[0].id);
    
    if (delError) console.error('Error cleaning up:', delError.message);
  }
}

testOrderInsertion();
