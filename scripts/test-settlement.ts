
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const [key, val] = line.split('=')
  if (key && val) env[key.trim()] = val.trim().replace(/"/g, '')
})

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌ ERROR: Missing Configuration')
  console.error('To run this test, you must have the SUPABASE_SERVICE_ROLE_KEY.')
  console.error('1. Open .env.local')
  console.error('2. Add: SUPABASE_SERVICE_ROLE_KEY=eyJh...')
  console.error('3. Try again.\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function runTest() {
  console.log('🧪 Starting Money Logic Verification...')

  // 1. SETUP: Create Test User
  const email = `test_money_${Date.now()}@example.com`
  const password = 'testpassword123'
  
  console.log(`Creating test user: ${email}`)
  let userId = '';

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) {
    console.warn('Failed to create new user:', authError.code)
    console.log('Attempting to find an existing test user...')
    
    // Fallback: List users and pick the last one
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    if (listError || !users?.users?.length) {
        console.error('Could not list users either:', listError)
        return
    }
    const lastUser = users.users[0] // Just pick the first one available
    userId = lastUser.id
    console.log(`Using existing user: ${userId} (${lastUser.email})`)
  } else {
    userId = authData.user.id
    console.log(`User created: ${userId}`)
  }

  // Ensure Wallet Exists & Set Balance
  // Wait a bit for triggers if any
  await new Promise(r => setTimeout(r, 1000))

  // Check wallet, create if missing (though triggers usually handle this)
  let { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single()
  
  // If no wallet (trigger failed or doesn't exist), create one
  if (!wallet) {
      console.log('No wallet found, creating manually...')
      const { data: newWallet, error: walletError } = await supabase.from('wallets').insert({
          user_id: userId,
          balance: 0, // Will update below
          asset: 'USD', // REQUIRED: Set default asset
          asset_type: 'fiat' // REQUIRED: Set default type
      }).select().single()
      if (walletError) {
          console.error('Failed to create wallet:', walletError)
          // Try to fetch again, maybe race condition
      }
      wallet = newWallet
  }

  // Set Balance to 1000
  console.log('Setting User Balance to $1000.00')
  // Note: We might need to use admin update or direct SQL if RLS blocks. Service role bypasses RLS.
  const { error: fundError } = await supabase
    .from('wallets')
    .update({ balance: 1000 })
    .eq('user_id', userId)

  if (fundError) {
      console.error('Failed to fund wallet:', fundError)
      return
  }

  // Double Check Balance
  const { data: initialWallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).single()
  console.log(`Initial Balance: $${initialWallet?.balance}`)
  if (initialWallet?.balance !== 1000) {
      console.error('Balance mismatch!')
      return
  }


  // --- TEST CASE 1: WINNING TRADE ---
  console.log('\n--- TEST CASE 1: WINNING TRADE ---')
  
  const AMOUNT = 100
  const PAYOUT_RATE = 85
  const STRIKE_PRICE = 50000
  const DURATION = 1 // 1 second for fast test
  
  console.log(`Executing Trade: BET $${AMOUNT} UP on BTC/USD @ $${STRIKE_PRICE}`)
  
  // 2. EXECUTE TRADE
  // We call the RPC directly to simulate the action
  const { data: tradeData, error: tradeError } = await supabase.rpc('execute_binary_trade', {
    p_user_id: userId,
    p_amount: AMOUNT,
    p_asset_symbol: 'BTC/USD',
    p_direction: 'UP',
    p_duration_seconds: DURATION,
    p_strike_price: STRIKE_PRICE,
    p_payout_rate: PAYOUT_RATE
  })

  if (tradeError) {
      console.error('Trade Execution Failed:', tradeError)
      return
  }

  const orderId = tradeData.order.id
  console.log(`Order Created: ${orderId}`)
  console.log(`Status: ${tradeData.order.status}`)

  // Assert Balance Deduction
  const { data: postTradeWallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).single()
  console.log(`Balance after trade: $${postTradeWallet?.balance}`)
  
  const expectedPostTrade = 1000 - AMOUNT
  if (postTradeWallet?.balance !== expectedPostTrade) {
      console.error(`❌ FAILURE: Balance should be ${expectedPostTrade}, got ${postTradeWallet?.balance}`)
  } else {
      console.log(`✅ SUCCESS: Balance deducted correctly.`)
  }

  console.log('Simulating time passing (2s)...')
  await new Promise(r => setTimeout(r, 2000))

  // 3. SETTLE TRADE (WIN)
  console.log('Settling Trade as WIN (Price went to 55000)')
  const FINAL_PRICE_WIN = 55000
  const OUTCOME_WIN = 'WIN'
  
  // Note: settle_binary_order updates status and balance
  const { data: settleData, error: settleError } = await supabase.rpc('settle_binary_order', {
      p_order_id: orderId,
      p_outcome: OUTCOME_WIN,
      p_final_price: FINAL_PRICE_WIN
  })

  if (settleError) {
      console.error('Settlement Failed:', settleError)
      // Check if order exists
      const { data: checkOrder } = await supabase.from('orders').select('*').eq('id', orderId).single()
      console.log('Order State:', checkOrder)
      return
  }

  // 4. VERIFY WIN
  const { data: finalWalletWin } = await supabase.from('wallets').select('balance').eq('user_id', userId).single()
  console.log(`Final Balance (WIN): $${finalWalletWin?.balance}`)

  const profit = AMOUNT * (PAYOUT_RATE / 100)
  const expectedWinBalance = expectedPostTrade + AMOUNT + profit
  
  if (Math.abs((finalWalletWin?.balance || 0) - expectedWinBalance) < 0.01) {
      console.log(`✅ SUCCESS: Balance updated correctly. (900 + 100 + ${profit} = ${expectedWinBalance})`)
  } else {
      console.error(`❌ FAILURE: Expected ${expectedWinBalance}, got ${finalWalletWin?.balance}`)
  }
  
  // Verify Order Status
  const { data: finalOrderWin } = await supabase.from('orders').select('status').eq('id', orderId).single()
  if (finalOrderWin?.status === 'WIN') {
       console.log(`✅ SUCCESS: Order status is WIN`)
  } else {
       console.error(`❌ FAILURE: Order status is ${finalOrderWin?.status}`)
  }


  // --- TEST CASE 2: LOSING TRADE ---
  console.log('\n--- TEST CASE 2: LOSING TRADE ---')
  
  // Reset Balance to 1000 for strict testing
  await supabase.from('wallets').update({ balance: 1000 }).eq('user_id', userId)
  console.log('Balance reset to $1000')

  console.log(`Executing Trade: BET $${AMOUNT} UP on BTC/USD @ $${STRIKE_PRICE}`)
  
  const { data: tradeDataLoss, error: tradeErrorLoss } = await supabase.rpc('execute_binary_trade', {
    p_user_id: userId,
    p_amount: AMOUNT,
    p_asset_symbol: 'BTC/USD',
    p_direction: 'UP',
    p_duration_seconds: DURATION,
    p_strike_price: STRIKE_PRICE,
    p_payout_rate: PAYOUT_RATE
  })

  if (tradeErrorLoss) {
      console.error('Trade Execution Failed:', tradeErrorLoss)
      return
  }
  const orderIdLoss = tradeDataLoss.order.id

  // Assert Deduction
  const { data: postTradeWalletLoss } = await supabase.from('wallets').select('balance').eq('user_id', userId).single()
  if (postTradeWalletLoss?.balance !== 900) {
      console.error(`❌ FAILURE: Balance deduction failed.`)
  }

  console.log('Simulating time passing (2s)...')
  await new Promise(r => setTimeout(r, 2000))

  // Settle as LOSS
  console.log('Settling Trade as LOSS (Price went to 45000)')
  const FINAL_PRICE_LOSS = 45000
  const OUTCOME_LOSS = 'LOSS'

  const { error: settleErrorLoss } = await supabase.rpc('settle_binary_order', {
    p_order_id: orderIdLoss,
    p_outcome: OUTCOME_LOSS,
    p_final_price: FINAL_PRICE_LOSS
  })

  if (settleErrorLoss) console.error('Settlement Error:', settleErrorLoss)

  // 5. VERIFY LOSS
  const { data: finalWalletLoss } = await supabase.from('wallets').select('balance').eq('user_id', userId).single()
  console.log(`Final Balance (LOSS): $${finalWalletLoss?.balance}`)

  if (finalWalletLoss?.balance === 900) {
      console.log(`✅ SUCCESS: Balance remained 900 (Loss deducted).`)
  } else {
      console.error(`❌ FAILURE: Expected 900, got ${finalWalletLoss?.balance}`)
  }

  const { data: finalOrderLoss } = await supabase.from('orders').select('status').eq('id', orderIdLoss).single()
  if (finalOrderLoss?.status === 'LOSS') {
      console.log(`✅ SUCCESS: Order status is LOSS`)
  } else {
      console.error(`❌ FAILURE: Order status is ${finalOrderLoss?.status}`)
  }

  // Cleanup
  if (!authError) {
      console.log('\nCleaning up test user...')
      await supabase.auth.admin.deleteUser(userId)
  } else {
      console.log('\nSkipping user deletion (Used existing user).')
      console.log('Resetting balance to 0...')
      await supabase.from('wallets').update({ balance: 0 }).eq('user_id', userId)
  }
  console.log('Done.')
}

runTest().catch(console.error)
