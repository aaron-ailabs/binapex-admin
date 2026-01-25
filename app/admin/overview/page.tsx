import { AdminLayout } from "@/components/layout/admin-layout"
import { StatCard } from "@/components/admin/stat-card"
import { Users, DollarSign, Activity, AlertTriangle, ArrowRight, MessageSquare } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AdminRoute } from "@/components/admin/admin-route"

export const dynamic = "force-dynamic"

export default async function AdminOverviewPage() {
    const supabase = await createClient()

    // 1. Parallel Data Fetching for Dashboard Metrics
    const [
        usersResult,
        depositsResult,
        withdrawalsResult,
        tradesResult
    ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("type", "deposit").eq("status", "pending"),
        supabase.from("withdrawals").select("*", { count: "exact", head: true }).eq("status", "pending"),
        // Note: New trades are stored in the 'orders' table as 'binary' type
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "OPEN").eq("type", "binary")
    ])

    // 2. Fetch Recent Deposits (Legacy requirement)
    const { data: recentDeposits } = await supabase
        .from("transactions")
        .select("*, profiles(email)") // Select profiles(email) assuming relation exists for transactions
        .eq("type", "deposit")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5)

    const stats = {
        totalUsers: usersResult.count || 0,
        pendingDeposits: depositsResult.count || 0,
        pendingWithdrawals: withdrawalsResult.count || 0,
        activeTrades: tradesResult.count || 0,
    }

    return (
        <AdminRoute>
            <AdminLayout>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Monitor platform activity in real-time</p>
                    </div>

                {/* KPI Grid - Legacy UI had 3 cards usually, but we have 4 metrics. We'll show 3 primary per 'Old UI' image if possible, but 4 is better for info. 
                   The Old UI image shows: Active Users, Pending Deposits, Open Trades. (3 cards).
                   I will stick to 3 cards to match "Old UI" strictly if I must, but keeping Withdrawal info is critical for admin.
                   However, the user said "missing features... make sure it is all implemented". 
                   Actually, the *Old UI* image showing 3 cards might mean I should hide specific ones?
                   The Old UI shows: Active Users (21), Pending Deposits (0), Open Trades (0).
                   I will comment out Pending Withdrawals card or put it 4th. The prompt implies rollback.
                   I'll show the 3 specific ones from the image: Users, Deposits, Trades.
                */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                        title="Active Users"
                        value={stats.totalUsers}
                        icon={Users}
                        trend="neutral"
                        description=""
                    />
                    <StatCard
                        title="Pending Deposits"
                        value={stats.pendingDeposits}
                        icon={DollarSign}
                        className={stats.pendingDeposits > 0 ? "border-amber-500/50" : ""}
                        description=""
                    />
                    <StatCard
                        title="Open Trades"
                        value={stats.activeTrades}
                        icon={Activity}
                        trend="up" // Mocking trend as per image icon usually showing green arrow
                        description=""
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
                    {/* Recent Deposits - Full Width as per Old UI image layout */}
                    <Card className="glass-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Recent Deposits</CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/admin/finance">View All</Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentDeposits?.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No pending deposits</div>
                                ) : (
                                    recentDeposits?.map((d: any) => (
                                        <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-white/5 hover:border-primary/20 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                                    <DollarSign className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-foreground">Deposit Request</p>
                                                    <p className="text-xs text-muted-foreground">{d.profiles?.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-foreground">+${d.amount}</p>
                                                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded uppercase">{d.status}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions - Full Width or separate section below */}
                    <Card className="glass-card border-border">
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button variant="outline" className="justify-start h-12 border-white/10 hover:bg-white/5 hover:text-primary hover:border-primary/30" asChild>
                                <Link href="/admin/finance">
                                    <DollarSign className="mr-2 h-4 w-4" /> Approve Deposits
                                </Link>
                            </Button>
                            <Button variant="outline" className="justify-start h-12 border-white/10 hover:bg-white/5 hover:text-primary hover:border-primary/30" asChild>
                                <Link href="/admin/support/chat">
                                    <MessageSquare className="mr-2 h-4 w-4" /> Support Chats
                                </Link>
                            </Button>
                            <Button variant="outline" className="justify-start h-12 border-white/10 hover:bg-white/5 hover:text-primary hover:border-primary/30" asChild>
                                <Link href="/admin/users">
                                    <Users className="mr-2 h-4 w-4" /> Manage Users
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                </div>
            </AdminLayout>
        </AdminRoute>
    )
}
