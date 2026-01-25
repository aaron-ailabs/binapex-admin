import { NotificationCenter } from "@/components/admin/notifications/notification-center"
import { AdminLayout } from "@/components/layout/admin-layout"
import { AdminRoute } from "@/components/admin/admin-route"

export default function NotificationsPage() {
    return (
        <AdminRoute>
            <AdminLayout>
                <div className="space-y-6">
                    <NotificationCenter />
                </div>
            </AdminLayout>
        </AdminRoute>
    )
}
