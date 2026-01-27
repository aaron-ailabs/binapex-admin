import { AdminRoute } from "@/components/admin/admin-route"
import { SettingsClient } from "./settings-client"

export const dynamic = "force-dynamic"

export default function SettingsPage() {
    return (
        <AdminRoute>
            <SettingsClient />
        </AdminRoute>
    )
}
