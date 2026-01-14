import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function SupportRootPage() {
  redirect("/admin/support/chat")
}
