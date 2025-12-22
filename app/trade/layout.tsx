
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function TradeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
