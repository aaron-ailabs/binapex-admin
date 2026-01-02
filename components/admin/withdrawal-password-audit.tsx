
"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface AuditLog {
    id: string
    action: string
    note: string | null
    timestamp: string
    admin_id: string
    // metrics/joins if needed, effectively just displaying basic info here
}

interface WithdrawalPasswordAuditProps {
    logs: AuditLog[]
}

export function WithdrawalPasswordAudit({ logs }: WithdrawalPasswordAuditProps) {
    if (logs.length === 0) return null

    return (
        <GlassCard className="p-6 mt-6">
            <h3 className="text-lg font-bold mb-4 text-[#F59E0B]">Withdrawal Password Audit Log</h3>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left py-2 px-3 text-sm text-muted-foreground">Date</th>
                            <th className="text-left py-2 px-3 text-sm text-muted-foreground">Action</th>
                            <th className="text-left py-2 px-3 text-sm text-muted-foreground">Admin ID</th>
                            <th className="text-left py-2 px-3 text-sm text-muted-foreground">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} className="border-b border-white/5">
                                <td className="py-2 px-3 text-sm text-white">
                                    {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm")}
                                </td>
                                <td className="py-2 px-3 text-sm">
                                    <Badge variant="outline" className={log.action === 'reset' ? 'text-red-400 border-red-400/20' : 'text-blue-400 border-blue-400/20'}>
                                        {log.action.toUpperCase()}
                                    </Badge>
                                </td>
                                <td className="py-2 px-3 text-sm text-muted-foreground font-mono text-xs">
                                    {log.admin_id}
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-300">
                                    {log.note || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    )
}
