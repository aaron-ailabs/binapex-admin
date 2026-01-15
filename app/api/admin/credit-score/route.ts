// SEC-FIX: Standardized auth and validation
import { verifyAdminAccess } from "@/lib/auth/admin-auth"
import { creditScoreSchema, sanitizeError } from "@/lib/schemas/validation"
import { CreditScoreService } from "@/lib/services/credit-score-service"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // SEC-FIX: Use standardized admin verification
    const { adminId } = await verifyAdminAccess()

    const body = await request.json()

    // SEC-FIX: Validate input with Zod schema
    const validatedData = creditScoreSchema.parse(body)

    // Update credit score
    const historyRecord = await CreditScoreService.updateCreditScore(
      validatedData.userId,
      validatedData.score,
      adminId,
      validatedData.reason
    )

    return NextResponse.json(
      {
        success: true,
        message: "Credit score updated successfully",
        data: historyRecord,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[API] Credit score update error:", error)
    // SEC-FIX: Sanitize error messages - don't expose internal details
    const message = sanitizeError(error)
    const status = error instanceof Error && error.message.includes("Unauthorized") ? 401 :
                   error instanceof Error && error.message.includes("Forbidden") ? 403 :
                   error instanceof Error && error.message.includes("Validation") ? 400 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
