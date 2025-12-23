"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"
import { getCreditScoreBadge } from "@/lib/types/database"
import type { Profile, CreditScoreHistory } from "@/lib/types/database"

interface CreditScoreManagerProps {
  user: Profile
  creditHistory: CreditScoreHistory[]
  onUpdate: (score: number, reason?: string) => Promise<void>
}

export function CreditScoreManager({ user, creditHistory, onUpdate }: CreditScoreManagerProps) {
  const [newScore, setNewScore] = useState(user.credit_score?.toString() || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleUpdate = async () => {
    if (!newScore || isNaN(Number(newScore))) {
      setError("Please enter a valid score (0-1000)")
      return
    }

    const score = Number(newScore)
    if (score < 0 || score > 1000) {
      setError("Score must be between 0 and 1000")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      await onUpdate(score)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update credit score")
    } finally {
      setIsLoading(false)
    }
  }

  const badge = getCreditScoreBadge(user.credit_score)

  return (
    <div className="space-y-6">
      {/* Current Score */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold mb-4">Current Credit Score</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="text-5xl font-bold text-white">{user.credit_score !== null ? user.credit_score : "—"}</div>
          <Badge variant="outline" className={badge.color}>
            {badge.label}
          </Badge>
        </div>

        {user.credit_score === null && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3">
            <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200">
              This user hasn't been assigned a credit score yet. Assign one to activate credit-based features.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Update Form */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold mb-4">Update Credit Score</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">New Score (0-1000)</label>
            <Input
              type="number"
              min="0"
              max="1000"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              placeholder="Enter score"
              className="bg-black/50 border-white/10"
            />
          </div>



          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-200">{error}</p>
            </div>
          )}

          <Button
            onClick={handleUpdate}
            disabled={isLoading || !newScore}
            className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-black font-bold disabled:opacity-50"
          >
            {isLoading ? "Updating..." : "Update Score"}
          </Button>
        </div>
      </GlassCard>

      {/* History */}
      {creditHistory.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold mb-4">Score History</h3>
          <div className="space-y-3">
            {creditHistory.map((record) => (
              <div key={record.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-white">
                      {record.previous_score !== null ? record.previous_score : "—"} → {record.new_score}
                    </span>
                    <Badge variant="outline" className={getCreditScoreBadge(record.new_score).color}>
                      {getCreditScoreBadge(record.new_score).label}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(record.created_at).toLocaleDateString()}</span>
                </div>
                {record.reason && <p className="text-xs text-gray-300">{record.reason}</p>}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
