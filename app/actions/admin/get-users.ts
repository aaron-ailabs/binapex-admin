"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getAdminUsersList() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );

  // 1️⃣ Ensure user session exists
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthenticated");
  }

  // 2️⃣ Enforce admin role at data layer
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!adminRole) {
    throw new Error("Unauthorized");
  }

  // 3️⃣ Query users under RLS
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}