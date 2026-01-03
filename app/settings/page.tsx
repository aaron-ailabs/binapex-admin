import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { SettingsForms } from "@/components/settings/settings-forms"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  const { data: secret } = await supabase.from("user_withdrawal_secrets").select("user_id").eq("user_id", user.id).single()

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-gray-400">Manage your account information and preferences</p>
        </div>

        <SettingsForms user={user} profile={profile} hasWithdrawalPassword={!!secret} />
      </div>
    </DashboardLayout>
  )
}
