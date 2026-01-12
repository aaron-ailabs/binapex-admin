"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SettlementAudit {
  id: string
  order_id: string
  user_id: string
  admin_id: string
  outcome: string
  rationale: string | null
  supporting_document_url: string | null
  final_price: number | null
  created_at: string
}

interface EnrichedAudit extends SettlementAudit {
  user_email?: string
}

export function TradeSettlementHistoryTable() {
  const supabase = createClient()
  const [logs, setLogs] = useState<EnrichedAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "WIN" | "LOSS">("all")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("trade_settlement_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      toast.error("Failed to load settlement logs")
      setLogs([])
      setLoading(false)
      return
    }

    const baseLogs = data || []

    if (baseLogs.length === 0) {
      setLogs([])
      setLoading(false)
      return
    }

    const userIds = Array.from(new Set(baseLogs.map((l) => l.user_id)))
    const { data: users } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds)

    const enriched = baseLogs.map((log) => ({
      ...log,
      user_email: users?.find((u) => u.id === log.user_id)?.email || undefined,
    }))

    setLogs(enriched)
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    const matchesOutcome = outcomeFilter === "all" || log.outcome === outcomeFilter

    const query = searchQuery.trim().toLowerCase()
    if (!query) return matchesOutcome

    const haystack = [
      log.order_id,
      log.user_id,
      log.admin_id,
      log.user_email,
      log.rationale,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return matchesOutcome && haystack.includes(query)
  })

  return (
    <Card className="bg-white/5 border-white/10 p-0 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-white font-bold">Settlement Audit History</h3>
        <Badge variant="outline" className="text-amber-500 border-amber-500/20">
          {filteredLogs.length} / {logs.length} Records
        </Badge>
      </div>

      <div className="px-4 py-3 border-b border-white/5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search by order, user, admin, rationale..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md bg-black/40 border-white/10"
        />
        <div className="flex gap-2">
          {["all", "WIN", "LOSS"].map((value) => (
            <Button
              key={value}
              size="sm"
              variant={outcomeFilter === value ? "default" : "outline"}
              onClick={() => setOutcomeFilter(value as "all" | "WIN" | "LOSS")}
              className={
                outcomeFilter === value
                  ? "bg-[#F59E0B] text-black"
                  : "border-white/10 bg-transparent hover:bg-white/5"
              }
            >
              {value === "all" ? "All Outcomes" : value}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No settlement logs match the current filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-black/20 text-gray-500 font-mono text-xs uppercase">
              <tr>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Order</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Outcome</th>
                <th className="p-3 text-left">Final Price</th>
                <th className="p-3 text-left">Rationale</th>
                <th className="p-3 text-left">Doc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-mono text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {log.order_id.slice(0, 8)}...
                  </td>
                  <td className="p-3">
                    <div className="text-xs text-white">
                      {log.user_email || "Unknown"}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {log.user_id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={
                        log.outcome === "WIN"
                          ? "text-emerald-400 border-emerald-400/30"
                          : "text-rose-400 border-rose-400/30"
                      }
                    >
                      {log.outcome}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {log.final_price != null ? `$${log.final_price}` : "-"}
                  </td>
                  <td className="p-3 max-w-xs">
                    <div className="line-clamp-2 text-xs">
                      {log.rationale || "-"}
                    </div>
                  </td>
                  <td className="p-3">
                    {log.supporting_document_url ? (
                      <a
                        href={log.supporting_document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 underline text-xs"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
