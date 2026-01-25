import { AdminLayout } from "@/components/layout/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AdminRoute } from "@/components/admin/admin-route"

export const dynamic = "force-dynamic"

export default function SettingsPage() {
    return (
        <AdminRoute>
            <AdminLayout>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Settings</h1>
                        <p className="text-muted-foreground mt-1">Configure global application parameters.</p>
                    </div>

                    <div className="grid gap-6">
                        <Card className="glass-card border-border">
                            <CardHeader>
                                <CardTitle>General Configuration</CardTitle>
                                <CardDescription>Basic platform settings and toggles.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Maintenance Mode</Label>
                                        <p className="text-sm text-muted-foreground">Disable user access for system updates.</p>
                                    </div>
                                    <Switch />
                                </div>
                                <Separator className="bg-white/10" />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Registration Enabled</Label>
                                        <p className="text-sm text-muted-foreground">Allow new users to sign up.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card border-border">
                            <CardHeader>
                                <CardTitle>Fees & Limits</CardTitle>
                                <CardDescription>Manage global financial parameters.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Withdrawal Fee (%)</Label>
                                        <Input defaultValue="1.5" className="bg-card/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Min Deposit ($)</Label>
                                        <Input defaultValue="50" className="bg-card/50" />
                                    </div>
                                </div>
                                <Button className="w-full sm:w-auto">Save Changes</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AdminLayout>
        </AdminRoute>
    )
}
