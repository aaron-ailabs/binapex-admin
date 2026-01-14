"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActiveTradesTable } from "./active-trades-table"
import { SettlementHistoryTable } from "./settlement-history-table"
import { Card, CardContent } from "@/components/ui/card"

interface TradeSettlementViewProps {
    initialActiveTrades: any[]
    initialSettlementLogs: any[]
}

export function TradeSettlementView({ initialActiveTrades, initialSettlementLogs }: TradeSettlementViewProps) {
    return (
        <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-4 bg-muted/50 p-1 h-auto">
                <TabsTrigger value="active" className="py-2">Active Trades ({initialActiveTrades.length})</TabsTrigger>
                <TabsTrigger value="history" className="py-2">Settlement History</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
                <Card className="glass-card border-border">
                    <CardContent className="p-0">
                        <ActiveTradesTable data={initialActiveTrades} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
                <Card className="glass-card border-border">
                    <CardContent className="p-0">
                        <SettlementHistoryTable data={initialSettlementLogs} />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
