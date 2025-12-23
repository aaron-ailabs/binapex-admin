import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { OrderMatchingEngine } from "@/lib/services/order-matching-engine"
import { z } from "zod"
import { rateLimitMiddleware } from "@/lib/middleware/rate-limit"
import type { NextRequest } from "next/server"
import { captureApiError } from "@/lib/utils/error-handler"

const CreateOrderSchema = z.object({
  asset_id: z.string().uuid(),
  order_type: z.enum(["buy", "sell"]),
  price: z.number().positive(),
  quantity: z.number().positive(),
})

export async function POST(request: NextRequest) {
  let userId: string | undefined
  let body: any = {}

  try {
    const rateLimitResponse = rateLimitMiddleware(request, 20, 60000)
    if (rateLimitResponse) return rateLimitResponse

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id
    body = await request.json()

    // 1. Normalize Inputs
    // support both camelCase and snake_case for maximum compatibility during transition
    const symbol = body.symbol || body.pair
    const side = (body.order_type || body.side || '').toLowerCase()
    const type = (body.type || 'limit').toLowerCase()
    const quantity = parseFloat(body.quantity || body.amount || '0')
    const price = parseFloat(body.price || '0')

    if (!symbol || !side || !quantity) {
        return Response.json({ error: "Missing required fields (symbol, side, quantity)" }, { status: 400 })
    }

    if (!['buy', 'sell'].includes(side)) {
        return Response.json({ error: "Invalid side. Must be 'buy' or 'sell'" }, { status: 400 })
    }

    if (!['limit', 'market', 'stop_limit'].includes(type)) {
        return Response.json({ error: "Invalid order type" }, { status: 400 })
    }
    
    // 2. Resolve Trading Pair
    let tradingPairId: string | null = null;
    const cleanSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '');

    const { data: pair } = await supabase
        .from('trading_pairs')
        .select('id, symbol')
        .or(`symbol.eq.${symbol},symbol.eq.${cleanSymbol}`)
        .single();

    if (pair) {
        tradingPairId = pair.id
    } else {
        // Fallback search
        const { data: fallbackPair } = await supabase
            .from('trading_pairs')
            .select('id')
            .ilike('symbol', `%${cleanSymbol}%`)
            .limit(1)
            .single();
        if (fallbackPair) tradingPairId = fallbackPair.id;
    }

    if (!tradingPairId) {
        return Response.json({ error: `Invalid trading pair: ${symbol}` }, { status: 400 })
    }

    // 3. Atomic Order Placement (Spot/Exchange Engine)
    // We use the `limit_orders` table path for the matching engine
    const { data: rpcResult, error: rpcError } = await supabase.rpc("place_order_atomic", {
      p_user_id: user.id,
      p_trading_pair_id: tradingPairId,
      p_side: side,
      p_type: type,
      p_price: price,
      p_amount: quantity,
      p_trigger_price: body.triggerPrice || null
    })

    if (rpcError) {
        throw new Error(rpcError.message)
    }

    if (!rpcResult.success) {
        throw new Error(rpcResult.error || "Order placement failed")
    }

    const orderId = rpcResult.order_id

    // 4. Trigger Matching Engine
    // We always trigger the engine for both Limit and Market orders
    // Market orders will execute immediately against best resting orders
    const engine = new OrderMatchingEngine(supabase)
    const matchingResult = await engine.matchOrders(tradingPairId)

    return Response.json({
      success: true,
      order_id: orderId,
      status: matchingResult.executed_trades.length > 0 ? 'PARTIAL_OR_FILLED' : 'OPEN',
      matching_result: matchingResult,
    })
  } catch (error) {
    captureApiError(error, {
      userId,
      endpoint: "/api/orders",
      action: "unified-create-order",
      metadata: { body: body || {} },
    })

    return Response.json({ error: error instanceof Error ? error.message : "Order implementation error" }, { status: 400 })
  }
}
