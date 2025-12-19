
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Mock Price Fetcher
function getMockPrice(symbol: string): number {
  return 90000 + Math.random() * 20000; // Random BTC-ish price
}

Deno.serve(async (req) => {
  try {
    // 1. Auth Check (Service Role only)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        return new Response('Unauthorized', { status: 401 })
    }

    // Initialize Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Fetch Expired Orders
    const now = new Date().toISOString()
    const { data: expiredOrders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'OPEN')
      .lte('end_time', now)

    if (fetchError) throw fetchError
    if (!expiredOrders || expiredOrders.length === 0) {
      return new Response(JSON.stringify({ message: 'No expired orders to settle' }), { headers: { 'Content-Type': 'application/json' } })
    }

    const results = []

    // 3. Process Each Order
    for (const order of expiredOrders) {
      const currentPrice = getMockPrice(order.asset_symbol)
      let outcome = 'LOSS'

      // Determine Outcome
      if (order.direction === 'UP' && currentPrice > order.strike_price) {
        outcome = 'WIN'
      } else if (order.direction === 'DOWN' && currentPrice < order.strike_price) {
        outcome = 'WIN'
      }
      // Note: Tie is usually a LOSS or REFUND depending on broker logic. Here we assume LOSS for strictness or Tie=Loss.
      // If Tie needs refund, logic would be different. Assuming strictly > or < for WIN.

      // 4. Settle via RPC
      const { data: settlement, error: rpcError } = await supabase.rpc('settle_binary_order', {
        p_order_id: order.id,
        p_outcome: outcome,
        p_final_price: currentPrice
      })

      results.push({
        order_id: order.id,
        symbol: order.asset_symbol,
        strike: order.strike_price,
        final: currentPrice,
        direction: order.direction,
        outcome,
        rpc_result: settlement,
        error: rpcError
      })
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, details: results }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
