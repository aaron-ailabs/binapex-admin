"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useSoundEffects } from "@/hooks/use-sound-effects"
import { useRouter } from "next/navigation"

export function GlobalAdminNotificationListener() {
    const supabase = createClient()
    const { play } = useSoundEffects()
    const router = useRouter()

    useEffect(() => {
        const setupListeners = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return // Should be admin

            // 1. New Support Messages (from Users)
            const chatChannel = supabase
                .channel('admin_global_chat')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `sender_role=eq.user`
                }, (payload: any) => {
                    play('notification')
                    toast.info("New Support Message", {
                        description: "A user has sent a new message.",
                        action: {
                            label: "View",
                            onClick: () => router.push('/support')
                        }
                    })
                })
                .subscribe()

            // 2. New Transactions (Deposits/Withdrawals pending)
            const txChannel = supabase
                .channel('admin_global_tx')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'transactions',
                }, (payload: any) => {
                    const newTx = payload.new
                    if (newTx.status === 'pending') {
                        const type = newTx.type === 'deposit' ? 'Deposit' : 'Withdrawal'
                        play('notification')
                        toast.info(`New ${type} Request`, {
                            description: `Amount: $${newTx.amount}`,
                            action: {
                                label: "View",
                                onClick: () => router.push(newTx.type === 'deposit' ? '/deposits' : '/withdrawals')
                            }
                        })
                    }
                })
                .subscribe()

            return () => {
                supabase.removeChannel(chatChannel)
                supabase.removeChannel(txChannel)
            }
        }

        setupListeners()
    }, [play, router, supabase])

    return null
}
