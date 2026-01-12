import { MaintenanceControls } from "@/components/admin/settings/maintenance-controls"
import { AdminLayout } from "@/components/layout/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
    return (
        <AdminLayout>
            <div className="space-y-6">
                <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>

                <div className="grid gap-6">
                    <MaintenanceControls />

                    {/* Placeholder for other settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>General Configuration</CardTitle>
                            <CardDescription>Platform-wide constants and parameters.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Additional settings coming soon...</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    )
}
