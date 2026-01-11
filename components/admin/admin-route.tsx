import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { ReactNode } from "react"

interface AdminRouteProps {
  children: ReactNode
}

export async function AdminRoute({ children }: AdminRouteProps) {
  // console.log("[AdminRoute] Starting admin route validation...")
  
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error("[AdminRoute] Auth error:", error.message, error)
    redirect("/admin/login")
  }

  if (!user) {
    console.log("[AdminRoute] No user found, redirecting to login")
    redirect("/admin/login")
  }

  // console.log("[AdminRoute] User authenticated:", user.email, "ID:", user.id)

  // Use the no-argument version of the RPC to get user role
  console.log("[AdminRoute] Calling get_user_role RPC...")
  const { data: role, error: roleError } = await supabase.rpc("get_user_role")
  console.log("[AdminRoute] get_user_role result:", { role, error: roleError?.message })

  if (roleError) {
    console.error("[AdminRoute] get_user_role RPC error:", roleError.message, roleError)

    // Fallback: Try to check role directly from profiles table
    console.log("[AdminRoute] Attempting fallback: direct profile query for user", user.id)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single()

    console.log("[AdminRoute] Profile query result:", { profile, error: profileError?.message })

    if (profileError) {
      console.error("[AdminRoute] Profile query error:", profileError.message, profileError)
      console.log("[AdminRoute] Redirecting to admin login due to verification failure")
      redirect("/admin/login")
    }

    if (profile?.role !== "admin") {
      console.warn("[AdminRoute] User is not admin (fallback check). Role:", profile?.role, "Email:", profile?.email)
      redirect("/admin/login")
    }

    console.log("[AdminRoute] Admin verified via fallback method. Role:", profile?.role)
    return <>{children}</>
  }

  if (role !== "admin") {
    console.warn("[AdminRoute] User is not admin. Role:", role)
    redirect("/admin/login")
  }

  console.log("[AdminRoute] Admin access granted. Role:", role)
  return <>{children}</>
}
