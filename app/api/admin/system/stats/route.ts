import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
    try {
        const supabase = await createClient()

        // Auth Check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Role Check (Simplified RPC call)
        const { data: roleData } = await supabase.rpc("get_user_role", { p_user_id: user.id })
        if (roleData !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Aggregate Stats
        const [
            { count: userCount },
            { count: tradeCount },
            { data: walletData }
        ] = await Promise.all([
            supabase.from("profiles").select("*", { count: "exact", head: true }),
            supabase.from("orders").select("*", { count: "exact", head: true }),
            supabase.from("wallets").select("balance").eq("asset", "USD")
        ])

        const platformUsdVolume = walletData?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0

        return NextResponse.json({
            users: userCount || 0,
            active_trades: tradeCount || 0,
            platform_usd_sum: platformUsdVolume,
            timestamp: new Date().toISOString()
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
