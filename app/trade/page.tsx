import { createClient } from "@/lib/supabase/server"
import { BinaryOptionsInterface } from "@/components/trading/binary-options-interface"
import { redirect } from "next/navigation"

export default async function TradePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Fetch initial balance server-side for immediate display
    let initialBalance = 0;
    const { data: wallets } = await supabase
        .from('wallets')
        .select('balance, locked_balance, asset')
        .eq('user_id', user.id)

    if (wallets) {
        wallets.forEach(w => {
            if (w.asset === 'USD' || w.asset === 'USDT') {
                initialBalance += Number(w.balance) - Number(w.locked_balance || 0)
            }
        })
    }

    return (
        <main className="min-h-screen bg-black text-white pb-20 md:pb-0">
             <BinaryOptionsInterface initialBalance={initialBalance} />
        </main>
    )
}
