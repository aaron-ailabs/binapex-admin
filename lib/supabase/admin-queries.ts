import { createClient } from "./server"
import { captureApiError, captureBusinessLogicError, handleSupabaseError } from "../utils/error-handler"

export async function getAdminStats() {
  const supabase = await createClient()

  const [{ count: totalUsers }, { count: pendingDeposits }, { count: pendingWithdrawals }, { data: recentActivity }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("type", "deposit")
        .eq("status", "pending"),
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("type", "withdrawal")
        .eq("status", "pending"),
      supabase
        .from("transactions")
        .select("id, type, amount, status, created_at, user_id, profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(10),
    ])

  return {
    totalUsers: totalUsers || 0,
    pendingDeposits: pendingDeposits || 0,
    pendingWithdrawals: pendingWithdrawals || 0,
    recentActivity: recentActivity || [],
  }
}

export async function getPaginatedUsers(page = 1, pageSize = 20, search = "") {
  const supabase = await createClient()

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data, count, error } = await query

  return {
    users: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    error,
  }
}

export async function approveDeposit(transactionId: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    // Call the atomic RPC
  const { error } = await supabase.rpc("approve_deposit", {
    transaction_id: transactionId,
    admin_id: user.id
  })

    if (error) {
      return handleSupabaseError(error, "approve-deposit")
    }

    return { success: true }
  } catch (error: any) {
    captureApiError(error, {
      action: "approve-deposit",
      metadata: { transactionId },
    })
    return { success: false, error: "Unexpected error during deposit approval" }
  }
}

export async function rejectDeposit(transactionId: string, reason: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const { error } = await supabase.rpc("reject_deposit", {
      p_transaction_id: transactionId,
      p_admin_id: user.id,
      p_reason: reason
    })

    if (error) {
      return handleSupabaseError(error, "reject-deposit")
    }

    return { success: true }
  } catch (error: any) {
    captureApiError(error, {
      action: "reject-deposit",
      metadata: { transactionId },
    })
    return { success: false, error: "Unexpected error during deposit rejection" }
  }
}

export async function approveWithdrawal(transactionId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const { error } = await supabase.rpc("approve_withdrawal", {
    p_withdrawal_id: transactionId,
    p_admin_id: user.id
  })

  if (error) {
    return handleSupabaseError(error, "approve-withdrawal")
  }

  return { success: true }
}

export async function rejectWithdrawal(transactionId: string, reason: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const { error } = await supabase.rpc("reject_withdrawal", {
      p_withdrawal_id: transactionId,
      p_admin_id: user.id,
      p_reason: reason
    })

    if (error) {
      captureApiError(error, {
        action: "reject-withdrawal",
        metadata: { transactionId },
      })
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    captureApiError(error, {
      action: "reject-withdrawal",
      metadata: { transactionId },
    })
    return { success: false, error: "Unexpected error during withdrawal rejection" }
  }
}

export async function getDashboardAnalytics() {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_dashboard_analytics")

  if (error) {
    handleSupabaseError(error, "get-dashboard-analytics")
    return {
      dailyVolume: [],
      userGrowth: []
    }
  }

  return data
}
