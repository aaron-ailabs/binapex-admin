"use client"

import type React from "react"

import Link from "next/link"
import { Logo } from "@/components/logo"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  DollarSign,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  Menu,
  X,
  LogOut,
  ArrowLeft,
  Settings,
} from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AdminNotificationBell } from "@/components/admin/admin-notification-bell"

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Finance", href: "/admin/finance", icon: DollarSign },
  { name: "Assets", href: "/admin/assets", icon: TrendingUp },
  { name: "Withdrawals", href: "/admin/withdrawals", icon: DollarSign },
  { name: "Trades", href: "/admin/trades", icon: TrendingUp },
  { name: "Notifications", href: "/admin/notifications", icon: MessageSquare },
  { name: "Suggestions", href: "/admin/suggestions", icon: ThumbsUp },
  { name: "Support", href: "/admin/support", icon: MessageSquare },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border lg:pl-64">
        <div className="h-full px-4 flex items-center justify-between lg:justify-end">
          {/* Mobile menu button placeholder for spacing on mobile */}
          <div className="lg:hidden w-10" />

          <div className="flex items-center gap-4">
            <AdminNotificationBell />
            <div className="hidden sm:block h-6 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 hidden sm:flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-3 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-card border border-border hover:bg-card/80"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 bg-card border-r border-border transition-transform duration-300",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <Logo layout="horizontal" width={28} height={28} />
            <p className="text-xs text-muted-foreground mt-2 pl-1">Admin Control Panel</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-card hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-border space-y-2">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Admin Dashboard</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 p-4 md:p-6 lg:p-8 min-h-screen pt-20 lg:pt-24">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  )
}
