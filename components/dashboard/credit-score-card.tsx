import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { Shield, AlertCircle } from "lucide-react"
import { getCreditScoreBadge } from "@/lib/types/database"

interface CreditScoreCardProps {
  creditScore: number | null
  creditScoreUpdatedAt: string | null
}

export function CreditScoreCard({ creditScore, creditScoreUpdatedAt }: CreditScoreCardProps) {
  const badge = getCreditScoreBadge(creditScore)

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#F59E0B]" />
          <h3 className="text-lg font-bold">Credit Score</h3>
        </div>
        {creditScore === null && (
          <span title="Not yet rated by admin">
            <AlertCircle className="h-4 w-4 text-gray-400" />
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-end gap-4">
          <div>
            <div className="text-4xl font-bold text-white">{creditScore !== null ? creditScore : "—"}</div>
            {creditScore !== null && <div className="text-xs text-gray-400 mt-1">out of 100</div>}
          </div>
          <Badge variant="outline" className={`${badge.color} mb-1`}>
            {badge.label}
          </Badge>
        </div>

        {creditScore === null && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300">
              Your credit score will be assigned by our admin team after review of your trading activity.
            </p>
          </div>
        )}

        {creditScoreUpdatedAt && (
          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-gray-400">Last updated: {new Date(creditScoreUpdatedAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
