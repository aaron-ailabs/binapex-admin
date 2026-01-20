"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    TrendingUp,
    CreditCard,
    MessageSquare,
    ShieldAlert,
    Settings,
    LogOut,
    ChevronRight,
    Wallet,
    History,
    Activity,
    Ticket,
    DollarSign
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    SidebarSeparator,
    useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Logo } from "@/components/logo"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// Navigation Config
interface NavItem {
    title: string
    url: string
    icon: any
    isActive?: boolean
    items?: {
        title: string
        url: string
    }[]
}

const navMain: NavItem[] = [
    {
        title: "Overview",
        url: "/admin/overview",
        icon: LayoutDashboard,
        isActive: true,
    },
    {
        title: "Users",
        url: "/admin/users",
        icon: Users,
    },
    {
        title: "Finance",
        url: "/admin/finance",
        icon: DollarSign, // Need to import DollarSign or similar
    },
    {
        title: "Assets",
        url: "/admin/assets",
        icon: TrendingUp,
    },
    {
        title: "Withdrawals",
        url: "/admin/withdrawals",
        icon: CreditCard,
    },
    {
        title: "Trades",
        url: "/admin/trades",
        icon: Activity,
    },
    {
        title: "Notifications",
        url: "/admin/notifications",
        icon: MessageSquare,
    },
    {
        title: "Suggestions",
        url: "/admin/suggestions",
        icon: Ticket, // Using Ticket or similar for suggestions
    },
    {
        title: "Support",
        url: "/admin/support/chat",
        icon: MessageSquare,
    },
    {
        title: "Settings", // Moved Settings to main nav as per old UI image usually having it visible or at bottom
        url: "/admin/settings",
        icon: Settings,
    },
]

const navSecondary: NavItem[] = [] // Emptying secondary as we moved Settings up or if we want to keep it separate we can. 
// BUT looking at the image "Old Admin UI", Settings is at the bottom. 
// The Image 1 (New) has Settings at bottom. Image 2 (Old) has Settings at bottom of list.
// I will keep Settings in navSecondary to separate it at the bottom if desired, OR put it in navMain.
// The image shows "Overview, Users, Finance, Assets, Withdrawals, Trades, Notifications, Suggestions, Support, Settings" all in one list.
// So I will put Settings in navMain for exact match.


export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const router = useRouter()
    const { state } = useSidebar()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push("/admin/login")
    }

    return (
        <Sidebar collapsible="icon" {...props} className="border-r border-border bg-card">
            <SidebarHeader>
                <div className={cn("flex items-center gap-2 px-2 py-3", state === "collapsed" ? "justify-center px-0" : "")}>
                    <Logo layout="icon" width={32} height={32} />
                    {state !== "collapsed" && (
                        <div className="flex flex-col">
                            <span className="font-bold text-lg text-primary tracking-tight">BINAPEX</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin Portal</span>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <SidebarMenu>
                    {navMain.map((item) => {
                        const isActive = pathname.startsWith(item.url)

                        // Render Simple Item
                        if (!item.items) {
                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="hover:bg-primary/10 hover:text-primary transition-all duration-200">
                                        <Link href={item.url} className={cn("flex items-center gap-3 w-full", isActive && "text-primary font-bold")}>
                                            <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                                            <span className="text-sm">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )
                        }

                        // Render Collapsible Item
                        return (
                            <Collapsible key={item.title} asChild defaultOpen={isActive} className="group/collapsible">
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton tooltip={item.title} isActive={isActive} className="hover:bg-primary/10 hover:text-primary">
                                            <item.icon />
                                            <span>{item.title}</span>
                                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.items?.map((subItem) => {
                                                const isSubActive = pathname === subItem.url
                                                return (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton asChild isActive={isSubActive} className={cn("hover:text-primary transition-colors", isSubActive && "text-primary font-bold")}>
                                                            <Link href={subItem.url}>
                                                                <span className="text-xs">{subItem.title}</span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                )
                                            })}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        )
                    })}
                </SidebarMenu>

                <SidebarSeparator className="my-4 opacity-50" />

                <SidebarMenu>
                    {navSecondary.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild tooltip={item.title} className="hover:bg-primary/10 hover:text-primary">
                                <Link href={item.url}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleLogout}
                            tooltip="Sign Out"
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                            <LogOut />
                            <span>Sign Out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
