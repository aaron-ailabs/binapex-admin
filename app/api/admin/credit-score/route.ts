import { createClient } from "@/lib/supabase/server"
import { CreditScoreService } from "@/lib/services/credit-score-service"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin status
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin")

    if (roleError || !isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const { userId, score, reason } = await request.json()

    if (!userId || score === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (typeof score !== "number" || score < 0 || score > 100) {
      return NextResponse.json({ error: "Score must be between 0 and 100" }, { status: 400 })
    }

    // Update credit score
    const historyRecord = await CreditScoreService.updateCreditScore(userId, score, user.id, reason)

    return NextResponse.json(
      {
        success: true,
        message: "Credit score updated successfully",
        data: historyRecord,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Credit score update error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
