"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts"
import { format } from "date-fns"

interface AnalyticsChartsProps {
    analytics: {
        dailyVolume: any[]
        userGrowth: any[]
    }
}

export function AnalyticsCharts({ analytics }: AnalyticsChartsProps) {
    const volumeData = analytics.dailyVolume.map(v => ({
        ...v,
        formattedDay: format(new Date(v.day), "MMM d")
    }))

    const userData = analytics.userGrowth.map(u => ({
        ...u,
        formattedDay: format(new Date(u.day), "MMM d")
    }))

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground text-lg">Transaction Volume (USD)</CardTitle>
                    <p className="text-xs text-muted-foreground italic">Last 14 days</p>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={volumeData}>
                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="formattedDay"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `$${v}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'black', border: '1px solid rgba(255,255,255,0.1)' }}
                                    labelStyle={{ color: 'hsl(var(--primary))' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="volume"
                                    stroke="hsl(var(--primary))"
                                    fillOpacity={1}
                                    fill="url(#colorVolume)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground text-lg">New User Registration</CardTitle>
                    <p className="text-xs text-muted-foreground italic">Last 30 days</p>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={userData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="formattedDay"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'black', border: '1px solid rgba(255,255,255,0.1)' }}
                                    labelStyle={{ color: 'hsl(var(--primary))' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
