import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse Input
  const body = await request.json();
  const { pair, side, type, amount, price, triggerPrice } = body; // amount is Asset amount

  if (!pair || !side || !type || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 3. Create Order (Validate & Lock)
  // For MARKET orders, we need a price to lock funds (for BUY).
  // If price is null/0 for MARKET, we fetch current market price + buffer?
  // User Prompt: "Market Order: Fetch opposite side orders sorted by best price."
  // Validation happens BEFORE matching.
  // We'll assume the frontend sends an estimated price for MARKET orders (safe for locking).
  // If not, we fetch best price here.
  let executionPrice = price;

  if (type === 'MARKET' && side === 'BUY' && (!price || price <= 0)) {
    // Fetch Best Ask
    const { data: asks } = await supabase
      .from('orders')
      .select('price')
      .eq('pair', pair)
      .eq('side', 'SELL')
      .eq('status', 'open')
      .order('price', { ascending: true })
      .limit(1);
      
    if (asks && asks.length > 0) {
       executionPrice = asks[0].price * 1.05; // 5% slippage buffer for locking
    } else {
       return NextResponse.json({ error: 'No liquidity for Market Buy' }, { status: 400 });
    }
  }

  // Call `create_order` RPC
  const { data: orderRes, error: orderError } = await supabase.rpc('create_order', {
    p_user_id: user.id,
    p_pair: pair,
    p_side: side,
    p_type: type,
    p_amount: amount,
    p_price: executionPrice,
    p_trigger_price: type === 'STOP_LIMIT' ? triggerPrice : null
  });

  if (orderError || !orderRes.success) {
    return NextResponse.json({ error: orderError?.message || orderRes?.error || 'Failed to create order' }, { status: 400 });
  }

  const myOrderId = orderRes.order_id;
  let remainingAmount = Number(amount);

  // 4. Matching Engine
  // Fetch opposite side
  const oppositeSide = side === 'BUY' ? 'sell' : 'buy'; // Database stores lowercase
  const orderDir = side === 'BUY' ? true : false; // Buy -> Match Low Sells (Ascending)

  // Query Loop
  // We fetch a batch of potential matches
  const { data: matches, error: matchError } = await supabase
    .from('orders')
    .select('*')
    .eq('pair', pair)
    .eq('side', oppositeSide)
    .eq('status', 'open')
    .order('price', { ascending: orderDir }) // Buy wants Lowest Sell. Sell wants Highest Buy (desc).
    // Wait, Sell wants Highest Buy. So if side=SELL, opposite=BUY, order=Desc (false).
    // If side=BUY, opposite=SELL, order=Asc (true).
    .limit(50); // Batch size

  if (matchError) {
    console.error('Matching fetch error:', matchError);
    // Return success for order creation, but matching failed. Order is OPEN.
    return NextResponse.json({ success: true, order_id: myOrderId, message: 'Order created but matching failed' });
  }

  if (!matches) {
     return NextResponse.json({ success: true, order_id: myOrderId, status: 'OPEN' });
  }

  let trades = [];

  for (const matchOrder of matches) {
    if (remainingAmount <= 0) break;

    // Price Check
    // If LIMIT: My Price must be >= Sell Price (Buy) or My Price <= Buy Price (Sell)
    if (type === 'LIMIT') {
       if (side === 'BUY' && Number(matchOrder.price) > Number(price)) continue; // Too expensive
       if (side === 'SELL' && Number(matchOrder.price) < Number(price)) continue; // Too cheap
    }

    // Determine Match Amount
    const matchAmount = Math.min(remainingAmount, Number(matchOrder.amount) - Number(matchOrder.filled_amount));
    if (matchAmount <= 0) continue;

    // Execution Price = Maker's Price (matchOrder.price)
    const execPrice = Number(matchOrder.price);

    // Call execute_trade RPC
    const { data: tradeRes, error: tradeError } = await supabase.rpc('execute_trade', {
      p_maker_order_id: matchOrder.id,
      p_taker_order_id: myOrderId,
      p_match_amount: matchAmount,
      p_price: execPrice,
      p_maker_fee_rate: Number(matchOrder.fee_rate) || 0.006, // Use stored rate
      p_taker_fee_rate: side === 'BUY' ? 0.006 : 0.011 // Taker fee (Me)
    });

    if (tradeError || !tradeRes.success) {
      console.error('Trade execution failed:', tradeError, tradeRes);
      continue;
    }

    remainingAmount -= matchAmount;
    trades.push(tradeRes.trade_id);
  }

  // If Market Order and remaining > 0, we might want to cancel the rest or let it sit.
  // "Immediate fill" implies we cancel.
  // But strictly, we'll leave it open for now unless we implement cancel.

  return NextResponse.json({ 
    success: true, 
    order_id: myOrderId, 
    filled: amount - remainingAmount, 
    trades 
  });
}
