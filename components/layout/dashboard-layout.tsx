"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  HeadphonesIcon,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

const SIDEBAR_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Trade", href: "/trade", icon: TrendingUp },
  { name: "Deposit", href: "/deposit", icon: ArrowDownToLine },
  { name: "Withdrawal", href: "/withdrawal", icon: ArrowUpFromLine },
  { name: "History", href: "/history", icon: History },
  { name: "Support", href: "/support", icon: HeadphonesIcon },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch profile with wallets join to get real USD balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, wallets(balance)")
        .eq("id", user.id)
        .single()
      
      // Use wallets[0].balance if available, else fallback to profile.balance_usd
      if (profile) {
        // @ts-ignore - Supabase types might verify specific join syntax
        const walletBalance = profile.wallets?.[0]?.balance
        // Use wallet balance if it exists (source of truth), otherwise profile cache
        setBalance(walletBalance !== undefined ? walletBalance : profile.balance_usd)
      }
    }

    fetchBalance()

    // Listen for custom wallet update events (e.g. from trade settlement)
    const handleWalletUpdate = () => fetchBalance()
    window.addEventListener('wallet_update', handleWalletUpdate)

    return () => {
        window.removeEventListener('wallet_update', handleWalletUpdate)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-black/40 backdrop-blur-md border-r border-white/10 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#D97706]">
              <TrendingUp className="h-5 w-5 text-black" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] bg-clip-text text-transparent">
              BINAPEX
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                    isActive
                      ? "bg-[#F59E0B]/10 text-[#FBBF24] border border-[#F59E0B]/20 shadow-lg shadow-[#F59E0B]/5"
                      : "text-gray-400 hover:text-white hover:bg-white/5",
                  )}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* User Balance Display */}
        <div className="mx-4 mb-2 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total Balance</p>
            <p className="text-xl font-bold text-emerald-400">
                ${balance !== null ? balance.toFixed(2) : "0.00"}
            </p>
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-0 w-full p-4 border-t border-white/10 bg-black/20">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={20} className="mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 p-4 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#D97706]">
              <TrendingUp className="h-4 w-4 text-black" />
            </div>
            <span className="font-bold text-[#F59E0B]">BINAPEX</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  )
}
