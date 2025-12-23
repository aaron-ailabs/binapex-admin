import { createClient } from "@/lib/supabase/server"
import type { CreditScoreHistory } from "@/lib/types/database"

export class CreditScoreService {
  /**
   * Get user's credit score
   * Returns null if user hasn't been rated yet (null-first logic)
   */
  static async getUserCreditScore(userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("credit_score, credit_score_updated_at")
      .eq("id", userId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update user's credit score with audit trail
   */
  static async updateCreditScore(
    userId: string,
    newScore: number,
    adminId: string,
    reason?: string,
  ): Promise<CreditScoreHistory> {
    if (newScore < 0 || newScore > 100) {
      throw new Error("Credit score must be between 0 and 100")
    }

    const supabase = await createClient()

    // Get current score for history
    const { data: currentProfile } = await supabase.from("profiles").select("credit_score").eq("id", userId).single()

    const previousScore = currentProfile?.credit_score || null

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        credit_score: newScore,
        credit_score_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (updateError) throw updateError

    // Record in history
    const { data: historyRecord, error: historyError } = await supabase
      .from("credit_score_history")
      .insert({
        user_id: userId,
        previous_score: previousScore,
        new_score: newScore,
        reason: reason || "Manual Update",
        changed_by: adminId,
      })
      .select()
      .single()

    if (historyError) throw historyError
    return historyRecord as CreditScoreHistory
  }

  /**
   * Get credit score history for a user
   */
  static async getCreditScoreHistory(userId: string, limit = 10) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("credit_score_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as CreditScoreHistory[]
  }
}
