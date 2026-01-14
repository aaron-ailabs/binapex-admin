import { AdminLayout } from "@/components/layout/admin-layout"
import { ShieldAlert, AlertTriangle, UserX, AlertOctagon } from "lucide-react"
import { StatCard } from "@/components/admin/stat-card"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default function RiskPage() {
    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Risk & Compliance</h1>
                    <p className="text-muted-foreground mt-1">Monitor system alerts, flagged users, and security audits.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Security Alerts" value={3} icon={ShieldAlert} className="border-red-500/50" description="Critical issues" />
                    <StatCard title="Flagged Users" value={12} icon={UserX} className="border-amber-500/50" description="Suspicious activity" />
                    <StatCard title="Failed Logins" value={145} icon={AlertTriangle} trend="up" description="Last 24 hours" />
                    <StatCard title="System Health" value="99.9%" icon={AlertOctagon} trend="neutral" description="Uptime" />
                </div>

                <Card className="glass-card border-border">
                    <CardHeader>
                        <CardTitle>Recent Security Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-red-950/20 border border-red-900/50 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <AlertOctagon className="h-5 w-5 text-red-500" />
                                    <div>
                                        <p className="font-bold text-red-400">Multiple Failed Login Attempts</p>
                                        <p className="text-sm text-red-300/60">User ID: 8f92...a12b • IP: 192.168.1.1</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="destructive">Investigate</Button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-amber-950/20 border border-amber-900/50 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    <div>
                                        <p className="font-bold text-amber-400">Large Withdrawal Request</p>
                                        <p className="text-sm text-amber-300/60">$50,000.00 triggered manual review threshold.</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" className="border-amber-500/20 text-amber-500 hover:bg-amber-500/10">Review</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    )
}
