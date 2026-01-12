import { TransactionHistory } from "@/components/admin/finance/transaction-history"
import { AdminLayout } from "@/components/layout/admin-layout"

export default function HistoryPage() {
    return (
        <AdminLayout>
            <div className="space-y-6">
                <TransactionHistory />
            </div>
        </AdminLayout>
    )
}
