import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    description?: string
    trend?: "up" | "down" | "neutral"
    trendValue?: string
    className?: string
    action?: React.ReactNode
}

export function StatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    trendValue,
    className,
    action
}: StatCardProps) {
    return (
        <Card className={cn("glass-card border-border hover:border-primary/20 transition-colors", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {action}
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">{value}</div>
                {(description || trend) && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                        {trend && (
                            <span className={cn(
                                "flex items-center font-medium mr-2",
                                trend === "up" ? "text-green-500" :
                                    trend === "down" ? "text-red-500" : "text-muted-foreground"
                            )}>
                                {trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-1" /> :
                                    trend === "down" ? <ArrowDownRight className="h-3 w-3 mr-1" /> : null}
                                {trendValue}
                            </span>
                        )}
                        <span className="truncate">{description}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
