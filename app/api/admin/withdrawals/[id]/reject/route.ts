import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { captureApiError } from "@/lib/utils/error-handler"

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient()

    // Verify admin authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin")

    if (roleError || !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const withdrawalId = params.id
    const { reason } = await request.json()

    const { data, error } = await supabase.rpc("reject_withdrawal", {
      p_withdrawal_id: withdrawalId,
      p_reason: reason || "Rejected by admin",
    })

    if (error) {
      console.error("[v0] Withdrawal rejection error:", error)
      captureApiError(error, {
        action: "Admin withdrawal rejection",
        metadata: {
          withdrawalId,
          adminId: user.id,
        },
      })
      return NextResponse.json({ error: error.message || "Failed to reject withdrawal" }, { status: 500 })
    }

    if (!data || data.success !== true) {
      const message = (data as any)?.error || "Failed to reject withdrawal"
      const wrappedError = new Error(message)
      captureApiError(wrappedError, {
        action: "Admin withdrawal rejection",
        metadata: {
          withdrawalId,
          adminId: user.id,
        },
      })
      return NextResponse.json({ error: message }, { status: 400 })
    }

    await supabase.from("admin_logs").insert({
      admin_id: user.id,
      action: "reject_withdrawal",
      details: { withdrawal_id: withdrawalId, reason },
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[v0] Withdrawal rejection exception:", error)
    captureApiError(error, { action: "Admin withdrawal rejection API" })
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
