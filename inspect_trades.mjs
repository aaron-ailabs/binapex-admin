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
  console.error('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTrades() {
  console.log('--- Inspecting Trading System ---');

  // 1. Check orders in non-final states
  console.log('\nChecking Pending/Open Orders:');
  const { data: openOrders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['pending', 'OPEN', 'processing', 'executing'])
    .order('created_at', { ascending: false });
  
  if (ordersError) {
    console.error('❌ Orders Error:', ordersError.message);
  } else {
    console.log(`Found ${openOrders.length} orders in non-final state.`);
    openOrders.forEach(o => console.log(`- ID: ${o.id}, Status: ${o.status}, Type: ${o.type}, Amount: ${o.amount}, Created: ${o.created_at}`));
  }

  // 2. Check executed_trades
  console.log('\nChecking Executed Trades:');
  const { data: eTrades, error: eTradesError } = await supabase
    .from('executed_trades')
    .select('*')
    .limit(5);
  
  if (eTradesError) {
    console.log('❌ executed_trades table:', eTradesError.message);
  } else {
    console.log(`Found ${eTrades.length} executed trades.`);
    if (eTrades.length > 0) {
      console.log('Columns:', Object.keys(eTrades[0]));
    }
  }

  // 3. Check for specific user who might be locked
  const { data: users } = await supabase.from('profiles').select('id, email').limit(5);
  if (users && users.length > 0) {
    console.log('\nChecking balances for sample users:');
    for (const user of users) {
      const { data: profile } = await supabase.from('profiles').select('balance_usd, bonus_balance').eq('id', user.id).single();
      const { data: wallets } = await supabase.from('wallets').select('asset_symbol, available_balance, locked_balance').eq('user_id', user.id);
      console.log(`User ${user.id} (${user.email}):`);
      console.log(`  Profile Balance: ${profile?.balance_usd}, Bonus: ${profile?.bonus_balance}`);
      if (wallets && wallets.length > 0) {
        wallets.forEach(w => console.log(`  Wallet ${w.asset_symbol}: Avail: ${w.available_balance}, Locked: ${w.locked_balance}`));
      }
    }
  }
}

inspectTrades();
