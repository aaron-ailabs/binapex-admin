import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { HistoryTabs } from "@/components/history/history-tabs"

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const PAGE_SIZE = 20
  const page = Number(searchParams?.page) || 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Fetch transactions with pagination
  const { data: transactions, count: transactionsCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to)

  // Fetch trades with asset info and pagination
  const { data: trades, count: tradesCount } = await supabase
    .from("trades")
    .select("*, asset:assets(*)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <p className="text-gray-400">View all your trading activities and financial transactions</p>
        </div>

        <HistoryTabs 
          transactions={transactions || []} 
          trades={trades || []} 
          currentPage={page}
          transactionsCount={transactionsCount || 0}
          tradesCount={tradesCount || 0}
          pageSize={PAGE_SIZE}
        />
      </div>
    </DashboardLayout>
  )
}
