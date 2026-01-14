"use client"

import { DetailDrawer } from "@/components/admin/detail-drawer"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { User, Shield, Wallet, History, AlertTriangle } from "lucide-react"

interface UserDetailDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: any
}

export function UserDetailDrawer({ open, onOpenChange, user }: UserDetailDrawerProps) {
    return (
        <DetailDrawer
            open={open}
            onOpenChange={onOpenChange}
            title="User Profile"
            description={`ID: ${user.id}`}
            footer={
                <div className="flex gap-2 justify-end w-full">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button variant="destructive">Freeze Account</Button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Identification Header */}
                <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">{user.full_name || "Unknown Name"}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex gap-2 mt-2">
                            <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded">VERIFIED</span>
                            <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded">TIER 1</span>
                        </div>
                    </div>
                </div>

                {/* 360 Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-4">
                        <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2">Overview</TabsTrigger>
                        <TabsTrigger value="trades" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2">Trades</TabsTrigger>
                        <TabsTrigger value="money" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2">Money</TabsTrigger>
                        <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2">Security</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-card/50 border-border">
                                <CardHeader className="py-3"><CardTitle className="text-xs uppercase text-muted-foreground">Total Balance</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-mono font-bold">$0.00</div></CardContent>
                            </Card>
                            <Card className="bg-card/50 border-border">
                                <CardHeader className="py-3"><CardTitle className="text-xs uppercase text-muted-foreground">Total PnL</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-mono font-bold text-green-500">+$0.00</div></CardContent>
                            </Card>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Recent Activity</h4>
                            <div className="rounded-md border border-white/5 bg-white/5 p-4 text-center text-sm text-muted-foreground">
                                No recent activity logs found.
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="trades">
                        <div className="flex items-center justify-center p-8 text-muted-foreground border border-dashed border-white/10 rounded-lg">
                            <History className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            <p>Trade history will appear here.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="money">
                        <div className="flex items-center justify-center p-8 text-muted-foreground border border-dashed border-white/10 rounded-lg">
                            <Wallet className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            <p>Transaction history will appear here.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="security">
                        <Button variant="outline" className="w-full justify-start text-red-500 border-red-500/20 hover:bg-red-500/10">
                            <AlertTriangle className="mr-2 h-4 w-4" /> Reset Withdrawal Password
                        </Button>
                    </TabsContent>
                </Tabs>
            </div>
        </DetailDrawer>
    )
}
