"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { getCreditScoreBadge } from "@/lib/types/database"

interface CreditScoreEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentScore: number | null
  userId: string
  onUpdate: (score: number, reason?: string) => Promise<void>
}

export function CreditScoreEditModal({
  isOpen,
  onClose,
  currentScore,
  userId,
  onUpdate,
}: CreditScoreEditModalProps) {
  const [score, setScore] = useState(currentScore?.toString() || "100")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const badge = getCreditScoreBadge(Number(score))

  const handleSubmit = async () => {
    const scoreNum = Number(score)
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return
    }

    setIsSubmitting(true)
    try {
      await onUpdate(scoreNum)
      onClose()
    } catch (error) {
      console.error("Failed to update credit score:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Update Credit Score</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div>
              <p className="text-sm text-muted-foreground">Current Score</p>
              <p className="text-3xl font-bold">{currentScore ?? "—"}</p>
            </div>
            <Badge variant="outline" className={getCreditScoreBadge(currentScore).color}>
              {getCreditScoreBadge(currentScore).label}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="score">New Score (0-100)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="bg-black/50 border-white/10 w-24"
                />
                <Badge variant="outline" className={badge.color}>
                  {badge.label}
                </Badge>
              </div>
            </div>


          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-white/5"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Number(score) < 0 || Number(score) > 100}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? "Updating..." : "Update Score"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
