import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
        return new Response(
            JSON.stringify({ error: 'Invalid token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const { symbol, side, type, size, leverage, price } = await req.json()

    if (!symbol || !side || !type || !size) {
        return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Get asset id with flexible matching
    const { data: assets, error: assetsError } = await supabaseClient
        .from('assets')
        .select('id, symbol')

    if (assetsError) throw assetsError

    const asset = assets.find(a => 
      a.symbol === symbol || 
      a.symbol === symbol.replace('-', '/') || 
      a.symbol === symbol.replace('/', '-')
    )

    if (!asset) {
        return new Response(
            JSON.stringify({ error: `Asset not found: ${symbol}` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Check balance before placing order
    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('balance_usd, balance')
        .eq('id', user.id)
        .single()
    
    if (profileError || !profile) {
        return new Response(
            JSON.stringify({ error: 'Profile not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const availableBalance = profile.balance_usd !== undefined ? profile.balance_usd : (profile.balance || 0);
    
    if (type === 'binary' || type === 'BINARY') {
        // For binary trades, we should ideally use the RPC, but if we insert here,
        // we must check balance.
        if (availableBalance < size) {
            return new Response(
                JSON.stringify({ error: 'Insufficient balance' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
    } else {
        // For regular trades, we check balance based on size * price or just size for market
        const cost = (price || 1) * size / (leverage || 1);
        if (availableBalance < cost) {
            return new Response(
                JSON.stringify({ error: 'Insufficient balance' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
    }
    
    const orderData = {
        user_id: user.id,
        asset_id: asset.id,
        side,
        type,
        size,
        leverage: leverage || 1,
        price: price || null, // Market orders might have null price initially or filled price
        status: 'pending'   
    }

    const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .insert(orderData)
        .select()
        .single()

    if (orderError) throw orderError

    return new Response(
      JSON.stringify(order),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
