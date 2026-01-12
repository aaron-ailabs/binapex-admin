"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { AlertTriangle, Power } from "lucide-react"

export function MaintenanceControls() {
    const [enabled, setEnabled] = useState(false)
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("system_settings")
            .select("*")
            .in('key', ['maintenance_mode', 'maintenance_message'])

        if (data) {
            const mode = data.find(s => s.key === 'maintenance_mode')?.value === 'true'
            const msg = data.find(s => s.key === 'maintenance_message')?.value || ""
            setEnabled(mode)
            setMessage(msg)
        }
        setLoading(false)
    }

    const handleSave = async () => {
        setLoading(true)
        const updates = [
            { key: 'maintenance_mode', value: String(enabled) },
            { key: 'maintenance_message', value: message }
        ]

        const { error } = await supabase
            .from("system_settings")
            .upsert(updates, { onConflict: 'key' })

        if (!error) {
            toast.success("Maintenance settings updated")
        } else {
            toast.error("Failed to update settings")
        }
        setLoading(false)
    }

    if (loading) return <div>Loading settings...</div>

    return (
        <div className="space-y-6 max-w-2xl bg-zinc-950 p-6 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Power className="h-5 w-5 text-orange-500" />
                        System Maintenance
                    </h3>
                    <p className="text-sm text-zinc-400">
                        Enable to effectively lock out non-admin users.
                    </p>
                </div>
                <Switch
                    checked={enabled}
                    onCheckedChange={setEnabled}
                    className="data-[state=checked]:bg-orange-600"
                />
            </div>

            {enabled && (
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-md flex gap-3 text-orange-400">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div className="text-sm">
                        <p className="font-semibold">Maintenance Mode Active</p>
                        <p>Users attempting to access the platform will see the message below.</p>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label>Maintenance Message (HTML Supported)</Label>
                <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="We will be back shortly..."
                    className="min-h-[100px] bg-zinc-900 border-zinc-700"
                />
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? "Saving..." : "Save Configuration"}
            </Button>
        </div>
    )
}
