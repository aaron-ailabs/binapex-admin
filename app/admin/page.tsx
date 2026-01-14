import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  // Redirect root /admin to the new dashboard location
  redirect("/admin/overview")
}
