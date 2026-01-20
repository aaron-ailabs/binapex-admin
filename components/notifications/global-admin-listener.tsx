"use client"

import { useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useSoundEffects } from "@/hooks/use-sound-effects"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { logError, logInfo } from "@/lib/utils"

export function GlobalAdminNotificationListener() {
    const supabase = useMemo(() => createClient(), [])
    const { play } = useSoundEffects()
    const router = useRouter()
    const { user } = useAuth()

    useEffect(() => {
        if (!user) return

        const chatChannel = supabase
            .channel("admin_global_chat")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "support_messages",
                    filter: "sender_role=eq.user",
                },
                () => {
                    play("notification")
                    toast.info("New Support Message", {
                        description: "A user has sent a new message.",
                        action: {
                            label: "View",
                            onClick: () => router.push("/support"),
                        },
                    })
                },
            )
            .subscribe((state) => logInfo("Realtime", `admin_global_chat ${state}`))

        const txChannel = supabase
            .channel("admin_global_tx")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "transactions",
                },
                (payload: any) => {
                    const newTx = payload.new
                    if (newTx?.status === "pending") {
                        const type = newTx.type === "deposit" ? "Deposit" : "Withdrawal"
                        play("notification")
                        toast.info(`New ${type} Request`, {
                            description: `Amount: $${newTx.amount}`,
                            action: {
                                label: "View",
                                onClick: () =>
                                    router.push(newTx.type === "deposit" ? "/deposits" : "/withdrawals"),
                            },
                        })
                    }
                },
            )
            .subscribe((state) => logInfo("Realtime", `admin_global_tx ${state}`))

        return () => {
            try {
                chatChannel.unsubscribe()
                txChannel.unsubscribe()
            } catch (e) {
                logError("Realtime cleanup", e)
            }
            supabase.removeChannel(chatChannel)
            supabase.removeChannel(txChannel)
        }
    }, [play, router, supabase, user])

    return null
}
