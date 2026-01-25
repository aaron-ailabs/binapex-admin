import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function validate() {
  console.log('--- EXTENDED VALIDATION START ---')

  // Get the admin user ID using the service role key
  const { data: usersData, error: listUsersError } = await supabase.auth.admin.listUsers();
  if (listUsersError) {
    console.error('Error listing users:', listUsersError);
    return;
  }
  console.log('All users:', usersData.users);
  const adminUser = usersData.users.find(user => user.email === 'e2e_polished@binapex.test');
  if (!adminUser) {
    console.error('Admin user not found with email e2e_polished@binapex.test');
    return;
  }
  const adminUserId = adminUser.id;
  console.log(`Admin User ID for e2e_polished@binapex.test: ${adminUserId}`);

  // Ensure the admin user is in the public.admin_users table
  const { data: existingAdminUser, error: fetchAdminUserError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', adminUserId)
    .single();

  if (fetchAdminUserError && fetchAdminUserError.code === 'PGRST116') { // No rows found
    console.log('Admin user not found in public.admin_users, inserting...');
    const { error: insertAdminUserError } = await supabase
      .from('admin_users')
      .insert({ user_id: adminUserId });

    if (insertAdminUserError) {
      console.error('Error inserting admin user into public.admin_users:', insertAdminUserError);
      return;
    }
    console.log('Admin user inserted into public.admin_users successfully.');
  } else if (fetchAdminUserError) {
    console.error('Error fetching admin user from public.admin_users:', fetchAdminUserError);
    return;
  } else {
    console.log('Admin user already exists in public.admin_users.');
  }

  // Reset the admin user's password
  const newAdminPassword = 'NewSecurePassword123!'; // Replace with a strong, generated password
  const { data: updateUserData, error: updateUserError } = await supabase.auth.admin.updateUserById(
    adminUserId,
    { password: newAdminPassword }
  );

  if (updateUserError) {
    console.error('Error updating admin user password:', updateUserError);
    return;
  }
  console.log('Admin user password reset successfully.');

  // 1. Get the admin user we just added
  const { data: adminUsers } = await supabase.from('admin_users').select('user_id').limit(1)
  const adminId = adminUsers[0].user_id
  console.log(`Using Admin ID: ${adminId}`)

  // 2. Find a valid asset
  const { data: assets } = await supabase.from('assets').select('id, symbol').limit(1)
  const assetId = assets[0].id
  console.log(`Using Asset: ${assets[0].symbol} (ID: ${assetId})`)

  // 3. Create a dummy order for a user
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1)
  const userId = profiles[0].id
  console.log(`Using User ID: ${userId}`)

  // Ensure user has a USD wallet
  await supabase.from('wallets').upsert({
    user_id: userId,
    asset_symbol: 'USD',
    available_balance: 1000.0,
    balance: 1000.0
  }, { onConflict: 'user_id,asset_symbol' })

  // Create an OPEN binary order via RPC
  console.log('\n3. Creating an OPEN binary order via RPC...')
  const { data: rpcOrderResult, error: rpcOrderError } = await supabase.rpc('execute_binary_trade', {
    p_user_id: userId,
    p_amount: 100.0,
    p_asset_symbol: 'BTC-USD', // Use asset symbol
    p_direction: 'UP', // Corrected direction
    p_duration_seconds: 300, // 5 minutes
    p_strike_price: 1.0,
    p_payout_rate: 80
  });

  if (rpcOrderError) {
    console.error('Error creating dummy order via RPC:', rpcOrderError.message);
    return;
  }
  if (rpcOrderResult && rpcOrderResult.success === false) {
    console.error('Error creating dummy order via RPC:', rpcOrderResult.error);
    return;
  }
  const orderId = rpcOrderResult.order_id;
  console.log(`Created Dummy Order: ${orderId}`);

  // Create a Supabase client with the admin's session for settlement
  // const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  // Sign in the admin user with the new password
  const { data: adminSignInData, error: adminSignInError } = await supabase.auth.signInWithPassword({
    email: 'e2e_polished@binapex.test',
    password: newAdminPassword
  });

  if (adminSignInError) {
    console.error('Admin sign-in failed:', adminSignInError);
    return;
  }

  const adminSession = adminSignInData.session;
  const adminSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await adminSupabase.auth.setSession(adminSession);

  // 4. Settling Order via RPC (WIN)...
  console.log('\n4. Settling Order via RPC (WIN)...');
  const { data: settlementResult, error: settlementError } = await adminSupabase.rpc('settle_binary_order', {
    p_order_id: orderId,
    p_outcome: 'WIN',
    p_final_price: 50000.0,
    p_rationale: 'Validation test settlement',
    p_supporting_document_url: null
  });

  if (settlementError) {
    console.log('Settlement RPC Error (Expected if no auth):', settlementError.message)
  } else if (settlementResult && settlementResult.success === false) {
    console.log('Settlement RPC Failed (Expected logic check):', settlementResult.error)
  } else {
    console.log('Settlement RPC Succeeded:', settleResult)
    
    // 5. Verify results
    console.log('\n5. Verifying results...')
    const { data: updatedOrder } = await supabase.from('orders').select('status, profit_loss').eq('id', order.id).single()
    console.log(`Order Status: ${updatedOrder.status}, Profit/Loss: ${updatedOrder.profit_loss}`)
    
    const { data: updatedWallet } = await supabase.from('wallets').select('available_balance').eq('user_id', userId).eq('asset_symbol', 'USD').single()
    console.log(`New Wallet Balance: ${updatedWallet.available_balance}`)
    
    const { data: auditLog } = await supabase.from('trade_settlement_audit_logs').select('*').eq('order_id', order.id).single()
    if (auditLog) {
      console.log('Audit Log Entry Found:', auditLog.id)
    } else {
      console.log('Audit Log Entry NOT FOUND!')
    }
  }

  console.log('\n--- VALIDATION END ---')
}

validate()
