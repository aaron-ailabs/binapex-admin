import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatCard } from "@/components/dashboard/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { GlassCard } from "@/components/ui/glass-card"
import { DollarSign, TrendingUp, Activity, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Asset, Trade } from "@/lib/types/database"
import { CreditScoreCard } from "@/components/dashboard/credit-score-card"
import { GeoUpdater } from "@/components/dashboard/geo-updater"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Fetch USD Wallet Balance (Source of Truth)
  const { data: usdWallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .eq("asset", "USD")
    .single()

  const { data: assets } = await supabase.from("assets").select("*").eq("is_active", true).limit(8)

  // Use Wallet Balance if available, fallback to profile (legacy)
  const displayBalance = usdWallet?.balance ?? profile?.balance_usd ?? 0

  const { data: portfolio } = await supabase
    .from("portfolio")
    .select("*")
    .eq("user_id", user.id)
    .gt("amount", 0)

  // Calculate 24h P/L based on Portfolio
  let totalPortfolioValue = 0
  let totalInvestedValue = 0

  portfolio?.forEach(item => {
    const asset = assets?.find(a => a.symbol === item.symbol)
    if (asset) {
      const currentVal = item.amount * asset.current_price
      const investedVal = item.amount * item.average_buy_price
      totalPortfolioValue += currentVal
      totalInvestedValue += investedVal
    }
  })

  // Adjusted P/L logic
  const totalPnL = totalPortfolioValue - totalInvestedValue

  const pnlPercent = totalInvestedValue > 0 ? ((totalPnL / totalInvestedValue) * 100).toFixed(2) : "0.00"

  return (
    <DashboardLayout>
      <GeoUpdater />
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-balance">
            Welcome back, {profile?.full_name || user.email?.split("@")[0] || "Trader"}
          </h1>
          <p className="text-gray-400">Your professional trading dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="USD Balance"
            value={`$${displayBalance.toFixed(2)}`}
            icon={DollarSign}
            trend={{
              value: "Available",
              isPositive: true,
            }}
          />
          <StatCard
            label="Portfolio Value"
            value={`$${totalPortfolioValue.toFixed(2)}`}
            icon={Activity}
            className="border-[#F59E0B]/20"
          />
          <StatCard
            label="Total P/L"
            value={`${totalPnL >= 0 ? "+" : ""}$${totalPnL.toFixed(2)}`}
            icon={TrendingUp}
            trend={{
              value: `${pnlPercent}%`,
              isPositive: totalPnL >= 0,
            }}
          />
          {/* Bonus Balance Card reused or kept */}
          <StatCard
            label="Bonus Balance"
            value={`$${(profile?.bonus_balance || 0).toFixed(2)}`}
            icon={Crown}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Overview */}
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Market Overview</h3>
                <Link href="/trade">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/10 bg-transparent"
                  >
                    View All Markets
                  </Button>
                </Link>
              </div>
              <DataTable
                data={assets || []}
                columns={[
                  {
                    header: "Asset",
                    accessor: (row: Asset) => (
                      <div>
                        <div className="font-medium text-white">{row.symbol}</div>
                        <div className="text-xs text-gray-400">{row.name}</div>
                      </div>
                    ),
                  },
                  {
                    header: "Type",
                    accessor: (row: Asset) => (
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-300 capitalize">
                        {row.type}
                      </span>
                    ),
                  },
                  {
                    header: "Price",
                    accessor: (row: Asset) => (
                      <span className="font-mono text-white">${row.current_price.toFixed(2)}</span>
                    ),
                  },
                  {
                    header: "24h Change",
                    accessor: (row: Asset) => (
                      <span className={`font-mono ${row.change_24h >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {row.change_24h >= 0 ? "+" : ""}
                        {row.change_24h.toFixed(2)}%
                      </span>
                    ),
                  },
                  {
                    header: "Action",
                    accessor: (row: Asset) => (
                      <Link href={`/trade?asset=${row.symbol}`}>
                        <Button variant="ghost" size="sm" className="text-[#F59E0B] hover:text-[#FBBF24] h-8">
                          Trade
                        </Button>
                      </Link>
                    ),
                  },
                ]}
              />
            </GlassCard>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Credit Score Card */}
            <CreditScoreCard
              creditScore={profile?.credit_score || null}
              creditScoreUpdatedAt={profile?.credit_score_updated_at || null}
            />

            {/* Quick Actions */}
            <GlassCard className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/trade" className="block">
                    <Button className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-black font-bold">
                      Start Trading
                    </Button>
                  </Link>
                  <Link href="/deposit" className="block">
                    <Button variant="outline" className="w-full border-white/10 bg-transparent hover:bg-white/5">
                      Deposit Funds
                    </Button>
                  </Link>
                  <Link href="/withdrawal" className="block">
                    <Button variant="outline" className="w-full border-white/10 bg-transparent hover:bg-white/5">
                      Withdraw Funds
                    </Button>
                  </Link>
                  <Link href="/history" className="block">
                    <Button variant="outline" className="w-full border-white/10 bg-transparent hover:bg-white/5">
                      View History
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Membership Status */}
              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Membership Tier</span>
                  <Link href="/membership">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#F59E0B] hover:text-[#FBBF24] h-auto p-0"
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-[#C0C0C0]" />
                  <span className="font-bold text-lg capitalize">{profile?.membership_tier || "Silver"}</span>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  Total Volume: ${(profile?.total_trade_volume || 0).toFixed(2)}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Portfolio Holdings */}
        {portfolio && portfolio.length > 0 && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold mb-4">Portfolio Holdings</h3>
            <DataTable
              data={portfolio}
              columns={[
                {
                  header: "Asset",
                  accessor: (row: any) => (
                    <span className="font-medium text-white">{row.symbol}</span>
                  ),
                },
                {
                  header: "Amount",
                  accessor: (row: any) => <span className="font-mono text-gray-300">{Number(row.amount).toFixed(6)}</span>,
                },
                {
                  header: "Avg Price",
                  accessor: (row: any) => <span className="font-mono text-white">${Number(row.average_buy_price).toFixed(2)}</span>,
                },
                {
                  header: "Current Price",
                  accessor: (row: any) => {
                    const asset = assets?.find(a => a.symbol === row.symbol)
                    return <span className="font-mono text-white">${asset?.current_price.toFixed(2) || '---'}</span>
                  },
                },
                {
                  header: "Value",
                  accessor: (row: any) => {
                    const asset = assets?.find(a => a.symbol === row.symbol)
                    return <span className="font-mono text-white">${(row.amount * (asset?.current_price || 0)).toFixed(2)}</span>
                  },
                },
                {
                  header: "P/L",
                  accessor: (row: any) => {
                    const asset = assets?.find(a => a.symbol === row.symbol)
                    if (!asset) return <span>---</span>

                    const cost = row.amount * row.average_buy_price
                    const current = row.amount * asset.current_price
                    const diff = current - cost

                    return (
                      <span
                        className={`font-mono font-bold ${diff >= 0 ? "text-emerald-500" : "text-red-500"}`}
                      >
                        {diff >= 0 ? "+" : ""}${diff.toFixed(2)}
                      </span>
                    )
                  },
                },
              ]}
            />
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  )
}
