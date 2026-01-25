import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Deno } from "https://deno.land/std@0.168.0/node/globals.ts"

interface OrderRequest {
  asset_id: string
  order_type: "buy" | "sell"
  amount: number // Investment amount (margin)
  leverage: number
}

serve(async (req) => {
  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 })
    }

    // Parse request body
    const body: OrderRequest = await req.json()
    const { asset_id, order_type, amount, leverage } = body

    console.log(`[v0] Processing order for user ${user.id}:`, { asset_id, order_type, amount, leverage })

    // Validate inputs
    if (!asset_id || !order_type || !amount || !leverage) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
    }

    if (amount <= 0 || leverage < 1 || leverage > 100) {
      return new Response(JSON.stringify({ error: "Invalid amount or leverage" }), { status: 400 })
    }

    // Fetch user profile - try both balance and balance_usd
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, balance, balance_usd")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 })
    }

    const availableBalance = profile.balance_usd !== undefined ? profile.balance_usd : profile.balance;

    // Check balance
    if (availableBalance < amount) {
      return new Response(
        JSON.stringify({
          error: "Insufficient balance",
          required: amount,
          available: availableBalance,
        }),
        { status: 400 },
      )
    }

    // Fetch latest market price
    const { data: marketPrice, error: priceError } = await supabase
      .from("market_prices")
      .select("price, bid_price, ask_price")
      .eq("asset_id", asset_id)
      .single()

    if (priceError || !marketPrice) {
      return new Response(JSON.stringify({ error: "Market price not available" }), { status: 404 })
    }

    // Apply standard slippage
    const executedPrice = order_type === "buy" ? marketPrice.ask_price : marketPrice.bid_price
    const slippageApplied = 0 // Using direct market prices now

    console.log(`[v0] Standard execution, Executed: ${executedPrice}`)

    // Calculate position size
    const totalSize = amount * leverage
    const assetQuantity = totalSize / executedPrice

    // Start transaction
    const { data: newBalance, error: balanceError } = await supabase.rpc("execute_trade_transaction", {
      p_user_id: user.id,
      p_asset_id: asset_id,
      p_order_type: order_type,
      p_entry_price: marketPrice.price,
      p_executed_price: executedPrice,
      p_size: assetQuantity,
      p_leverage: leverage,
      p_margin_used: amount,
      p_slippage_applied: slippageApplied,
      p_risk_mode: "standard", // Constant now
    })

    if (balanceError) {
      console.error("[v0] Transaction error:", balanceError)
      return new Response(JSON.stringify({ error: "Failed to execute trade", details: balanceError.message }), {
        status: 500,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          asset_id,
          order_type,
          executed_price: executedPrice,
          size: assetQuantity,
          leverage,
          margin_used: amount,
          slippage_applied: slippageApplied,
          risk_mode: "standard",
        },
        new_balance: newBalance,
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[v0] Execute order error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
