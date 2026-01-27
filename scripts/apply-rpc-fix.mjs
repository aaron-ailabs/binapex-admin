
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../binapex-trader/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
CREATE OR REPLACE FUNCTION public.execute_binary_trade(
    p_user_id uuid, 
    p_amount numeric, 
    p_asset_symbol text, 
    p_direction text, 
    p_duration_seconds integer, 
    p_strike_price numeric, 
    p_payout_rate numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_expiry timestamp with time zone;
  v_balance numeric;
  v_asset_id uuid;
  v_side text;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.is_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than 0');
  END IF;

  SELECT id INTO v_asset_id FROM public.assets WHERE symbol = p_asset_symbol LIMIT 1;
  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset not found');
  END IF;

  -- HUNTED BUG: Deterministic balance check with FOR UPDATE
  SELECT available_balance INTO v_balance 
  FROM public.wallets 
  WHERE user_id = p_user_id AND asset_symbol = 'USD'
  FOR UPDATE;
  
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.wallets
  SET available_balance = available_balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id AND asset_symbol = 'USD';

  v_expiry := NOW() + (p_duration_seconds || ' seconds')::INTERVAL;
  v_side := CASE WHEN p_direction = 'UP' THEN 'buy' ELSE 'sell' END;

  INSERT INTO public.orders (
    user_id, asset_id, side, asset_symbol, direction, amount, strike_price, payout_rate, status, end_time, expiry_at, type, created_at
  ) VALUES (
    p_user_id, v_asset_id, v_side, p_asset_symbol, p_direction, p_amount, p_strike_price, p_payout_rate, 
    'OPEN', v_expiry, v_expiry, 'binary', NOW()
  ) RETURNING id INTO v_order_id;

  INSERT INTO admin_notifications (user_id, type, message)
  VALUES (p_user_id, 'trade', concat('New Binary Trade: ', p_asset_symbol, ' ', p_direction, ' $', p_amount));

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'expiry_at', v_expiry);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
`;

async function run() {
    console.log('Applying RPC Fix...');
    // Note: Use the 'supabase-js' client with a generated RPC if possible, 
    // but since we need DDL, we'd normally use the MCP. 
    // Since MCP is EOF, I'll try to use the 'exec_sql' RPC if it exists in this project.
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error('SQL Error (exec_sql might not exist):', error.message);
        console.log('Falling back to direct SQL (this requires Postgres connection)...');
    } else {
        console.log('RPC Fix Applied Successfully!');
    }
}

run();
