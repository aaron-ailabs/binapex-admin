"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Search } from "lucide-react"
import { AdminNotificationBell } from "@/components/admin/admin-notification-bell"
import { RealtimeStatus } from "@/components/admin/realtime-status"

export function SiteHeader() {
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/50 backdrop-blur-md px-4 sticky top-0 z-10">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
                <Separator orientation="vertical" className="mr-2 h-4" />
            </div>

            {/* Global Search Placeholder */}
            <div className="flex-1 flex max-w-xl items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-transparent focus-within:border-primary/50 transition-colors">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search users, transactions, or settings..."
                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/70"
                />
            </div>

            <div className="ml-auto flex items-center gap-4">
                <RealtimeStatus />
                <AdminNotificationBell />
            </div>
        </header>
    )
}
