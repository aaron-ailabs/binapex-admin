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

async function checkOrdersRLS() {
  console.log('--- Checking Orders RLS and Structure ---');
  
  // 1. Try to insert a dummy order for a real user
  const testUserId = 'feb39302-19db-4c07-bc61-1c4bb4ddd54a'; // trader@binapex22.com
  
  console.log('\nTrying to insert test order for user:', testUserId);
  const testOrder = {
    user_id: testUserId,
    type: 'market',
    side: 'buy',
    amount: 0.01,
    status: 'pending',
    pair: 'BTC/USD' // Guessing column name
  };

  const { data, error } = await supabase.from('orders').insert([testOrder]).select();
  
  if (error) {
    console.error('❌ Insert Error:', error.message);
    if (error.message.includes('column')) {
       // If it's a column error, let's list columns again carefully
       const { data: cols } = await supabase.from('orders').select('*').limit(1);
       if (cols && cols[0]) {
         console.log('Actual columns in orders:', Object.keys(cols[0]));
       }
    }
  } else {
    console.log('✅ Insert Success:', data[0].id);
    // Cleanup
    await supabase.from('orders').delete().eq('id', data[0].id);
  }

  // 2. Check for triggers or constraints that might lock it
  // (We'd need direct SQL for this, which is hard right now)
}

checkOrdersRLS();