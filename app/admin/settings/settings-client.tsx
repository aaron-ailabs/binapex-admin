"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

export function SettingsClient() {
    const [settings, setSettings] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/admin/settings")
            .then(res => res.json())
            .then(data => {
                const map = data.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {})
                setSettings(map)
                setLoading(false)
            })
            .catch(() => toast.error("Failed to load settings"))
    }, [])

    const toggleSetting = async (key: string, currentValue: string) => {
        const newValue = currentValue === "true" ? "false" : "true"
        setSettings(prev => ({ ...prev, [key]: newValue }))

        const res = await fetch("/api/admin/settings", {
            method: "POST",
            body: JSON.stringify({ key, value: newValue })
        })

        if (!res.ok) {
            toast.error(`Failed to update ${key}`)
            setSettings(prev => ({ ...prev, [key]: currentValue }))
        } else {
            toast.success(`${key} updated to ${newValue}`)
        }
    }

    return (
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
                                <Switch
                                    checked={settings.maintenance_mode === "true"}
                                    disabled={loading}
                                    onCheckedChange={() => toggleSetting("maintenance_mode", settings.maintenance_mode || "false")}
                                />
                            </div>
                            <Separator className="bg-white/10" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Registration Enabled</Label>
                                    <p className="text-sm text-muted-foreground">Allow new users to sign up.</p>
                                </div>
                                <Switch
                                    checked={settings.registration_enabled === "true"}
                                    disabled={loading}
                                    onCheckedChange={() => toggleSetting("registration_enabled", settings.registration_enabled || "true")}
                                />
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
    )
}
