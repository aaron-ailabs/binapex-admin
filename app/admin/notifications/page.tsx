import { NotificationCenter } from "@/components/admin/notifications/notification-center"
import { AdminLayout } from "@/components/layout/admin-layout"

export default function NotificationsPage() {
    return (
        <AdminLayout>
            <div className="space-y-6">
                <NotificationCenter />
            </div>
        </AdminLayout>
    )
}
